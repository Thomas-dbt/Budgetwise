import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/server-auth'
import { prisma } from '@/lib/prisma'
import { getMarketSymbol } from '@/lib/investment-valuation'
import { getTradingViewPrice } from '@/lib/tradingview-price'
import { getCoinGeckoPrice } from '@/lib/coingecko-price'

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId()

    // Récupérer tous les investissements en mode "marché" de l'utilisateur
    const assets = await prisma.investmentAsset.findMany({
      where: { 
        userId,
        valuationMode: 'marché',
        readOnly: false
      },
      select: {
        id: true,
        symbol: true,
        category: true,
        tradingViewSymbol: true,
        name: true,
        currency: true
      }
    })

    const updatedPrices: Record<string, number> = {}

    // Fonction pour récupérer le taux de change USD/EUR
    const getUsdToEurRate = async (): Promise<number> => {
      try {
        const url = 'https://query1.finance.yahoo.com/v8/finance/chart/EURUSD=X?interval=1d&range=1d'
        const response = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          cache: 'no-store'
        })
        if (response.ok) {
          const data = await response.json()
          if (data.chart?.result?.[0]?.meta) {
            const eurUsdRate = data.chart.result[0].meta.regularMarketPrice || 1.1
            return 1 / eurUsdRate // Convertir USD/EUR en EUR/USD
          }
        }
      } catch (error) {
        console.error('Error fetching USD/EUR rate:', error)
      }
      return 0.92 // Taux par défaut approximatif si échec
    }

    // Fonction pour récupérer le prix depuis CoinGecko (priorité), puis TradingView/Yahoo Finance
    const fetchPrice = async (symbol: string, category: string, tradingViewSymbol: string | null | undefined, assetId: string | undefined, assetName?: string, assetCurrency?: string) => {
      try {
        // Vérifier si c'est de l'or dans le nom aussi
        const isGoldInName = assetName && (
          assetName.toUpperCase().includes('OR') || 
          assetName.toUpperCase().includes('GOLD') ||
          assetName.toUpperCase().includes('AUR')
        )
        
        // Utiliser une catégorie modifiée si on détecte l'or dans le nom
        const effectiveCategory = isGoldInName ? 'Or' : category
        
        // PRIORITÉ 1: Utiliser CoinGecko avec le symbole TradingView directement
        // Si un symbole TradingView est configuré, l'utiliser en priorité
        let symbolToUse = tradingViewSymbol || symbol
        
        // Si pas de symbole TradingView mais que c'est de l'or, utiliser XAUUSD
        if (!tradingViewSymbol && (isGoldInName || effectiveCategory === 'Or' || symbol.toUpperCase().includes('OR') || symbol.toUpperCase().includes('GOLD'))) {
          symbolToUse = 'XAUUSD'
        }
        
        // Si pas de symbole TradingView mais que c'est du Bitcoin, utiliser BTCUSD
        if (!tradingViewSymbol && (effectiveCategory === 'Crypto' || symbol.toUpperCase().includes('BTC'))) {
          symbolToUse = 'BTCUSD'
        }
        
        console.log(`🔍 Using symbol: ${symbolToUse} (tradingViewSymbol: ${tradingViewSymbol}, symbol: ${symbol})`)
        
        const coinGeckoPrice = await getCoinGeckoPrice(symbolToUse)
        if (coinGeckoPrice && coinGeckoPrice.price > 0) {
          console.log(`✅ Price from CoinGecko for ${symbolToUse}: ${coinGeckoPrice.price.toFixed(2)}${coinGeckoPrice.currency}`)
          console.log(`📋 CoinGecko result: price=${coinGeckoPrice.price}, currency=${coinGeckoPrice.currency}, unit=${coinGeckoPrice.unit}`)
          
          // Retourner le prix exactement tel que récupéré depuis CoinGecko, sans aucune conversion
          console.log(`✅ FINAL CoinGecko: Returning ${coinGeckoPrice.price.toFixed(2)}${coinGeckoPrice.currency} for ${symbolToUse} (NO CONVERSION, DIRECT FROM COINGECKO)`)
          return coinGeckoPrice.price
        }
        
        // PRIORITÉ 2: Si CoinGecko échoue, utiliser Yahoo Finance directement avec le symbole
        console.log(`⚠️ CoinGecko failed for ${symbolToUse}, trying Yahoo Finance directly...`)
        
        // Déterminer le symbole à utiliser pour Yahoo Finance
        let yahooSymbol = symbolToUse.toUpperCase()
        
        // Mapper les symboles TradingView vers Yahoo Finance
        if (yahooSymbol === 'XAUUSD' || yahooSymbol.includes('XAU') || yahooSymbol.includes('GOLD')) {
          yahooSymbol = 'GC=F' // Futures COMEX pour l'or en USD
        } else if (yahooSymbol === 'BTCUSD' || yahooSymbol.startsWith('BTC')) {
          yahooSymbol = 'BTC-USD'
        } else if (yahooSymbol === 'ETHUSD' || yahooSymbol.startsWith('ETH')) {
          yahooSymbol = 'ETH-USD'
        }
        
        // Détecter la devise depuis le symbole original
        let targetCurrency = 'USD'
        const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD']
        for (const currency of currencies) {
          if (symbolToUse.toUpperCase().endsWith(currency)) {
            targetCurrency = currency
            break
          }
        }
        
        console.log(`🔍 Yahoo Finance: Using symbol ${yahooSymbol} for ${symbolToUse}, targetCurrency=${targetCurrency}`)
        
        // Récupérer le prix depuis Yahoo Finance
        const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`
        const yahooResponse = await fetch(yahooUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          cache: 'no-store'
        })
        
        if (yahooResponse.ok) {
          const yahooData = await yahooResponse.json()
          if (yahooData.chart?.result?.[0]?.meta) {
            let price = yahooData.chart.result[0].meta.regularMarketPrice || 
                       yahooData.chart.result[0].meta.previousClose || 
                       0
            
            if (price > 0) {
              const currencyFromYahoo = yahooData.chart.result[0].meta.currency || 'USD'
              console.log(`✅ Yahoo Finance: ${yahooSymbol} = ${price.toFixed(2)}${currencyFromYahoo}`)
              
              // Si la devise de Yahoo Finance est différente de la devise cible, convertir
              if (currencyFromYahoo === 'USD' && targetCurrency === 'EUR') {
                // Convertir USD vers EUR
                const eurUsdUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/EURUSD=X?interval=1d&range=1d'
                const eurUsdResponse = await fetch(eurUsdUrl, {
                  headers: { 'User-Agent': 'Mozilla/5.0' },
                  cache: 'no-store'
                })
                if (eurUsdResponse.ok) {
                  const eurUsdData = await eurUsdResponse.json()
                  if (eurUsdData.chart?.result?.[0]?.meta) {
                    const eurUsdRate = eurUsdData.chart.result[0].meta.regularMarketPrice || 1.1
                    price = price / eurUsdRate
                    console.log(`💱 Converted USD to EUR: ${price.toFixed(2)}€`)
                  }
                }
              } else if (currencyFromYahoo !== targetCurrency && targetCurrency === 'USD') {
                // Si on veut USD mais que Yahoo Finance retourne autre chose, ne pas convertir
                console.log(`⚠️ Yahoo Finance returned ${currencyFromYahoo} but we want ${targetCurrency}, using ${currencyFromYahoo} price: ${price}`)
              }
              
              console.log(`✅ FINAL Yahoo Finance: Returning ${price.toFixed(2)}${targetCurrency} for ${symbolToUse} (NO CONVERSION)`)
              return price
            }
          }
        }
        
        const marketSymbol = getMarketSymbol(symbol, effectiveCategory, tradingViewSymbol)
        if (!marketSymbol) return null

        let yahooSymbol = marketSymbol.symbol
        if (marketSymbol.kind === 'crypto') {
          yahooSymbol = `${marketSymbol.symbol}-USD`
        }
        
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`
        const response = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          cache: 'no-store' // Ne pas mettre en cache pour avoir les prix en temps réel
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.chart?.result?.[0]?.meta) {
            let price = data.chart.result[0].meta.regularMarketPrice || 
                       data.chart.result[0].meta.previousClose || 
                       null
            
            if (price === null) return null

            // Si c'est de l'or (GC=F ou XAUUSD), le prix est en dollars par once troy
            // Il faut convertir en euros et déterminer si l'utilisateur veut le prix par gramme ou par once
            const isGold = marketSymbol.kind === 'gold' || 
                          yahooSymbol === 'GC=F' || 
                          symbol.toUpperCase().includes('OR') || 
                          symbol.toUpperCase().includes('GOLD') ||
                          (tradingViewSymbol && tradingViewSymbol.toUpperCase().includes('XAU'))
            
            if (isGold) {
              // Récupérer le taux de change USD/EUR
              const usdToEur = await getUsdToEurRate()
              const pricePerOnceInEur = price * usdToEur
              const pricePerGramInEur = pricePerOnceInEur / 31.1035 // 1 once troy = 31.1035 grammes
              
              console.log(`💰 Gold price from Yahoo Finance: ${price}$/oz = ${pricePerOnceInEur.toFixed(2)}€/oz = ${pricePerGramInEur.toFixed(2)}€/g`)
              
              // Si TradingView était configuré mais a échoué, retourner le prix par once pour correspondre à TradingView
              if (tradingViewSymbol && (tradingViewSymbol.toUpperCase().includes('XAU') || tradingViewSymbol.toUpperCase().includes('GOLD'))) {
                console.log(`✅ TradingView symbol was configured, returning price per ounce to match TradingView: ${pricePerOnceInEur.toFixed(2)}€/oz`)
                return pricePerOnceInEur
              }
              
              // Récupérer l'investissement pour voir comment il a été saisi
              if (assetId) {
                const asset = await prisma.investmentAsset.findUnique({
                  where: { id: assetId },
                  select: { currentPrice: true, amountInvested: true, quantity: true, name: true }
                })
                
                if (asset) {
                  // Déterminer si l'utilisateur parle de grammes ou d'onces
                  let purchasePricePerUnit = 0
                  if (asset.amountInvested && asset.quantity > 0) {
                    purchasePricePerUnit = Number(asset.amountInvested) / Number(asset.quantity)
                  } else if (asset.currentPrice) {
                    purchasePricePerUnit = Number(asset.currentPrice)
                  }
                  
                  console.log(`📈 Asset ${asset.name}: purchasePricePerUnit=${purchasePricePerUnit}€, currentPrice=${asset.currentPrice}, quantity=${asset.quantity}`)
                  console.log(`🔍 Gold price analysis: purchase=${purchasePricePerUnit}€, pricePerGram=${pricePerGramInEur.toFixed(2)}€/g, pricePerOunce=${pricePerOnceInEur.toFixed(2)}€/oz`)
                  
                  // Si le prix actuel stocké est > 1000, utiliser les onces (probablement déjà en onces)
                  if (asset.currentPrice && Number(asset.currentPrice) > 1000) {
                    console.log(`✅ Gold detected as ounces (current price > 1000€): returning ${pricePerOnceInEur.toFixed(2)}€/oz`)
                    return pricePerOnceInEur
                  }
                  
                  // Si le prix d'achat est très élevé (> 2000€), c'est définitivement des onces
                  if (purchasePricePerUnit > 2000) {
                    console.log(`✅ Gold detected as ounces (purchase price > 2000€): returning ${pricePerOnceInEur.toFixed(2)}€/oz`)
                    return pricePerOnceInEur
                  }
                  
                  // Si le prix d'achat est très bas (< 50€), l'utilisateur parle probablement de grammes
                  if (purchasePricePerUnit > 0 && purchasePricePerUnit < 50) {
                    console.log(`✅ Gold detected as grams: purchase price ${purchasePricePerUnit}€/g, returning ${pricePerGramInEur.toFixed(2)}€/g`)
                    return pricePerGramInEur
                  }
                  
                  // Si le prix actuel stocké est < 50, utiliser les grammes
                  if (asset.currentPrice && Number(asset.currentPrice) > 0 && Number(asset.currentPrice) < 50) {
                    console.log(`✅ Gold detected as grams (current price < 50€): returning ${pricePerGramInEur.toFixed(2)}€/g`)
                    return pricePerGramInEur
                  }
                  
                  // Si le prix d'achat est entre 50 et 2000, comparer avec les prix attendus
                  if (purchasePricePerUnit > 0) {
                    const diffToGram = Math.abs(purchasePricePerUnit - pricePerGramInEur)
                    const diffToOunce = Math.abs(purchasePricePerUnit - pricePerOnceInEur)
                    
                    if (diffToOunce < diffToGram) {
                      console.log(`✅ Gold detected as ounces (closer to ounce price, diff: ${diffToOunce.toFixed(2)} vs ${diffToGram.toFixed(2)}): returning ${pricePerOnceInEur.toFixed(2)}€/oz`)
                      return pricePerOnceInEur
                    } else {
                      console.log(`✅ Gold detected as grams (closer to gram price, diff: ${diffToGram.toFixed(2)} vs ${diffToOunce.toFixed(2)}): returning ${pricePerGramInEur.toFixed(2)}€/g`)
                      return pricePerGramInEur
                    }
                  }
                }
              }
              
              // Par défaut, retourner le prix par once (comme TradingView)
              console.log(`✅ Gold default: returning price per ounce ${pricePerOnceInEur.toFixed(2)}€/oz (to match TradingView)`)
              return pricePerOnceInEur
            }
            
            // Pour les autres actifs, convertir en EUR si nécessaire
            const currency = data.chart.result[0].meta.currency || 'USD'
            if (currency === 'USD' && price > 0) {
              const usdToEur = await getUsdToEurRate()
              return price * usdToEur
            }
            
            return price
          }
        }
      } catch (error) {
        console.error(`Error fetching price for ${symbol}:`, error)
      }
      return null
    }

    // Récupérer tous les prix en parallèle
    const pricePromises = assets
      .filter(asset => asset.symbol)
      .map(asset => 
        fetchPrice(asset.symbol!, asset.category, asset.tradingViewSymbol, asset.id, asset.name, asset.currency).then(price => ({
          id: asset.id,
          price: price
        }))
      )
    
    const priceResults = await Promise.all(pricePromises)
    
    // Mettre à jour les prix dans la base de données avec la devise correspondante
    const updatePromises = priceResults
      .filter(({ price }) => price !== null)
      .map(async ({ id, price }) => {
        // Récupérer l'investissement pour obtenir le symbole TradingView
        const asset = await prisma.investmentAsset.findUnique({
          where: { id },
          select: { tradingViewSymbol: true, symbol: true }
        })
        
        // Détecter la devise depuis le symbole TradingView
        let detectedCurrency = 'EUR' // Par défaut EUR
        const symbolToCheck = asset?.tradingViewSymbol || asset?.symbol || ''
        const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'CNY', 'INR', 'BRL', 'KRW', 'MXN', 'SGD', 'HKD', 'NZD', 'SEK', 'NOK', 'DKK', 'PLN', 'RUB', 'TRY', 'ZAR', 'THB', 'IDR', 'MYR']
        for (const currency of currencies) {
          if (symbolToCheck.toUpperCase().endsWith(currency)) {
            detectedCurrency = currency
            break
          }
        }
        
        console.log(`💱 Updating asset ${id}: price=${price}, symbolToCheck=${symbolToCheck}, detectedCurrency=${detectedCurrency}`)
        
        // Mettre à jour le prix ET la devise pour qu'ils correspondent
        return prisma.investmentAsset.update({
          where: { id },
          data: {
            currentPrice: price!,
            currency: detectedCurrency, // Mettre à jour la devise pour correspondre au symbole
            lastValuationDate: new Date()
          }
        })
      })

    await Promise.all(updatePromises)

    // Retourner les prix mis à jour
    priceResults.forEach(({ id, price }) => {
      if (price !== null) {
        updatedPrices[id] = price
      }
    })

    return NextResponse.json({
      success: true,
      updatedCount: Object.keys(updatedPrices).length,
      prices: updatedPrices
    })
  } catch (error: any) {
    console.error('Update prices error:', error)
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de la mise à jour des prix' },
      { status: 500 }
    )
  }
}


import { prisma } from '@/lib/prisma'
import { getMarketSymbol } from '@/lib/investment-valuation'
import { getTradingViewPrice } from '@/lib/tradingview-price'
import { getCoinGeckoPrice } from '@/lib/coingecko-price'

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId()

    // Récupérer tous les investissements en mode "marché" de l'utilisateur
    const assets = await prisma.investmentAsset.findMany({
      where: { 
        userId,
        valuationMode: 'marché',
        readOnly: false
      },
      select: {
        id: true,
        symbol: true,
        category: true,
        tradingViewSymbol: true,
        name: true,
        currency: true
      }
    })

    const updatedPrices: Record<string, number> = {}

    // Fonction pour récupérer le taux de change USD/EUR
    const getUsdToEurRate = async (): Promise<number> => {
      try {
        const url = 'https://query1.finance.yahoo.com/v8/finance/chart/EURUSD=X?interval=1d&range=1d'
        const response = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          cache: 'no-store'
        })
        if (response.ok) {
          const data = await response.json()
          if (data.chart?.result?.[0]?.meta) {
            const eurUsdRate = data.chart.result[0].meta.regularMarketPrice || 1.1
            return 1 / eurUsdRate // Convertir USD/EUR en EUR/USD
          }
        }
      } catch (error) {
        console.error('Error fetching USD/EUR rate:', error)
      }
      return 0.92 // Taux par défaut approximatif si échec
    }

    // Fonction pour récupérer le prix depuis CoinGecko (priorité), puis TradingView/Yahoo Finance
    const fetchPrice = async (symbol: string, category: string, tradingViewSymbol: string | null | undefined, assetId: string | undefined, assetName?: string, assetCurrency?: string) => {
      try {
        // Vérifier si c'est de l'or dans le nom aussi
        const isGoldInName = assetName && (
          assetName.toUpperCase().includes('OR') || 
          assetName.toUpperCase().includes('GOLD') ||
          assetName.toUpperCase().includes('AUR')
        )
        
        // Utiliser une catégorie modifiée si on détecte l'or dans le nom
        const effectiveCategory = isGoldInName ? 'Or' : category
        
        // PRIORITÉ 1: Utiliser CoinGecko avec le symbole TradingView directement
        // Si un symbole TradingView est configuré, l'utiliser en priorité
        let symbolToUse = tradingViewSymbol || symbol
        
        // Si pas de symbole TradingView mais que c'est de l'or, utiliser XAUUSD
        if (!tradingViewSymbol && (isGoldInName || effectiveCategory === 'Or' || symbol.toUpperCase().includes('OR') || symbol.toUpperCase().includes('GOLD'))) {
          symbolToUse = 'XAUUSD'
        }
        
        // Si pas de symbole TradingView mais que c'est du Bitcoin, utiliser BTCUSD
        if (!tradingViewSymbol && (effectiveCategory === 'Crypto' || symbol.toUpperCase().includes('BTC'))) {
          symbolToUse = 'BTCUSD'
        }
        
        console.log(`🔍 Using symbol: ${symbolToUse} (tradingViewSymbol: ${tradingViewSymbol}, symbol: ${symbol})`)
        
        const coinGeckoPrice = await getCoinGeckoPrice(symbolToUse)
        if (coinGeckoPrice && coinGeckoPrice.price > 0) {
          console.log(`✅ Price from CoinGecko for ${symbolToUse}: ${coinGeckoPrice.price.toFixed(2)}${coinGeckoPrice.currency}`)
          console.log(`📋 CoinGecko result: price=${coinGeckoPrice.price}, currency=${coinGeckoPrice.currency}, unit=${coinGeckoPrice.unit}`)
          
          // Retourner le prix exactement tel que récupéré depuis CoinGecko, sans aucune conversion
          console.log(`✅ FINAL CoinGecko: Returning ${coinGeckoPrice.price.toFixed(2)}${coinGeckoPrice.currency} for ${symbolToUse} (NO CONVERSION, DIRECT FROM COINGECKO)`)
          return coinGeckoPrice.price
        }
        
        // PRIORITÉ 2: Si CoinGecko échoue, utiliser Yahoo Finance directement avec le symbole
        console.log(`⚠️ CoinGecko failed for ${symbolToUse}, trying Yahoo Finance directly...`)
        
        // Déterminer le symbole à utiliser pour Yahoo Finance
        let yahooSymbol = symbolToUse.toUpperCase()
        
        // Mapper les symboles TradingView vers Yahoo Finance
        if (yahooSymbol === 'XAUUSD' || yahooSymbol.includes('XAU') || yahooSymbol.includes('GOLD')) {
          yahooSymbol = 'GC=F' // Futures COMEX pour l'or en USD
        } else if (yahooSymbol === 'BTCUSD' || yahooSymbol.startsWith('BTC')) {
          yahooSymbol = 'BTC-USD'
        } else if (yahooSymbol === 'ETHUSD' || yahooSymbol.startsWith('ETH')) {
          yahooSymbol = 'ETH-USD'
        }
        
        // Détecter la devise depuis le symbole original
        let targetCurrency = 'USD'
        const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD']
        for (const currency of currencies) {
          if (symbolToUse.toUpperCase().endsWith(currency)) {
            targetCurrency = currency
            break
          }
        }
        
        console.log(`🔍 Yahoo Finance: Using symbol ${yahooSymbol} for ${symbolToUse}, targetCurrency=${targetCurrency}`)
        
        // Récupérer le prix depuis Yahoo Finance
        const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`
        const yahooResponse = await fetch(yahooUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          cache: 'no-store'
        })
        
        if (yahooResponse.ok) {
          const yahooData = await yahooResponse.json()
          if (yahooData.chart?.result?.[0]?.meta) {
            let price = yahooData.chart.result[0].meta.regularMarketPrice || 
                       yahooData.chart.result[0].meta.previousClose || 
                       0
            
            if (price > 0) {
              const currencyFromYahoo = yahooData.chart.result[0].meta.currency || 'USD'
              console.log(`✅ Yahoo Finance: ${yahooSymbol} = ${price.toFixed(2)}${currencyFromYahoo}`)
              
              // Si la devise de Yahoo Finance est différente de la devise cible, convertir
              if (currencyFromYahoo === 'USD' && targetCurrency === 'EUR') {
                // Convertir USD vers EUR
                const eurUsdUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/EURUSD=X?interval=1d&range=1d'
                const eurUsdResponse = await fetch(eurUsdUrl, {
                  headers: { 'User-Agent': 'Mozilla/5.0' },
                  cache: 'no-store'
                })
                if (eurUsdResponse.ok) {
                  const eurUsdData = await eurUsdResponse.json()
                  if (eurUsdData.chart?.result?.[0]?.meta) {
                    const eurUsdRate = eurUsdData.chart.result[0].meta.regularMarketPrice || 1.1
                    price = price / eurUsdRate
                    console.log(`💱 Converted USD to EUR: ${price.toFixed(2)}€`)
                  }
                }
              } else if (currencyFromYahoo !== targetCurrency && targetCurrency === 'USD') {
                // Si on veut USD mais que Yahoo Finance retourne autre chose, ne pas convertir
                console.log(`⚠️ Yahoo Finance returned ${currencyFromYahoo} but we want ${targetCurrency}, using ${currencyFromYahoo} price: ${price}`)
              }
              
              console.log(`✅ FINAL Yahoo Finance: Returning ${price.toFixed(2)}${targetCurrency} for ${symbolToUse} (NO CONVERSION)`)
              return price
            }
          }
        }
        
        const marketSymbol = getMarketSymbol(symbol, effectiveCategory, tradingViewSymbol)
        if (!marketSymbol) return null

        let yahooSymbol = marketSymbol.symbol
        if (marketSymbol.kind === 'crypto') {
          yahooSymbol = `${marketSymbol.symbol}-USD`
        }
        
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`
        const response = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          cache: 'no-store' // Ne pas mettre en cache pour avoir les prix en temps réel
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.chart?.result?.[0]?.meta) {
            let price = data.chart.result[0].meta.regularMarketPrice || 
                       data.chart.result[0].meta.previousClose || 
                       null
            
            if (price === null) return null

            // Si c'est de l'or (GC=F ou XAUUSD), le prix est en dollars par once troy
            // Il faut convertir en euros et déterminer si l'utilisateur veut le prix par gramme ou par once
            const isGold = marketSymbol.kind === 'gold' || 
                          yahooSymbol === 'GC=F' || 
                          symbol.toUpperCase().includes('OR') || 
                          symbol.toUpperCase().includes('GOLD') ||
                          (tradingViewSymbol && tradingViewSymbol.toUpperCase().includes('XAU'))
            
            if (isGold) {
              // Récupérer le taux de change USD/EUR
              const usdToEur = await getUsdToEurRate()
              const pricePerOnceInEur = price * usdToEur
              const pricePerGramInEur = pricePerOnceInEur / 31.1035 // 1 once troy = 31.1035 grammes
              
              console.log(`💰 Gold price from Yahoo Finance: ${price}$/oz = ${pricePerOnceInEur.toFixed(2)}€/oz = ${pricePerGramInEur.toFixed(2)}€/g`)
              
              // Si TradingView était configuré mais a échoué, retourner le prix par once pour correspondre à TradingView
              if (tradingViewSymbol && (tradingViewSymbol.toUpperCase().includes('XAU') || tradingViewSymbol.toUpperCase().includes('GOLD'))) {
                console.log(`✅ TradingView symbol was configured, returning price per ounce to match TradingView: ${pricePerOnceInEur.toFixed(2)}€/oz`)
                return pricePerOnceInEur
              }
              
              // Récupérer l'investissement pour voir comment il a été saisi
              if (assetId) {
                const asset = await prisma.investmentAsset.findUnique({
                  where: { id: assetId },
                  select: { currentPrice: true, amountInvested: true, quantity: true, name: true }
                })
                
                if (asset) {
                  // Déterminer si l'utilisateur parle de grammes ou d'onces
                  let purchasePricePerUnit = 0
                  if (asset.amountInvested && asset.quantity > 0) {
                    purchasePricePerUnit = Number(asset.amountInvested) / Number(asset.quantity)
                  } else if (asset.currentPrice) {
                    purchasePricePerUnit = Number(asset.currentPrice)
                  }
                  
                  console.log(`📈 Asset ${asset.name}: purchasePricePerUnit=${purchasePricePerUnit}€, currentPrice=${asset.currentPrice}, quantity=${asset.quantity}`)
                  console.log(`🔍 Gold price analysis: purchase=${purchasePricePerUnit}€, pricePerGram=${pricePerGramInEur.toFixed(2)}€/g, pricePerOunce=${pricePerOnceInEur.toFixed(2)}€/oz`)
                  
                  // Si le prix actuel stocké est > 1000, utiliser les onces (probablement déjà en onces)
                  if (asset.currentPrice && Number(asset.currentPrice) > 1000) {
                    console.log(`✅ Gold detected as ounces (current price > 1000€): returning ${pricePerOnceInEur.toFixed(2)}€/oz`)
                    return pricePerOnceInEur
                  }
                  
                  // Si le prix d'achat est très élevé (> 2000€), c'est définitivement des onces
                  if (purchasePricePerUnit > 2000) {
                    console.log(`✅ Gold detected as ounces (purchase price > 2000€): returning ${pricePerOnceInEur.toFixed(2)}€/oz`)
                    return pricePerOnceInEur
                  }
                  
                  // Si le prix d'achat est très bas (< 50€), l'utilisateur parle probablement de grammes
                  if (purchasePricePerUnit > 0 && purchasePricePerUnit < 50) {
                    console.log(`✅ Gold detected as grams: purchase price ${purchasePricePerUnit}€/g, returning ${pricePerGramInEur.toFixed(2)}€/g`)
                    return pricePerGramInEur
                  }
                  
                  // Si le prix actuel stocké est < 50, utiliser les grammes
                  if (asset.currentPrice && Number(asset.currentPrice) > 0 && Number(asset.currentPrice) < 50) {
                    console.log(`✅ Gold detected as grams (current price < 50€): returning ${pricePerGramInEur.toFixed(2)}€/g`)
                    return pricePerGramInEur
                  }
                  
                  // Si le prix d'achat est entre 50 et 2000, comparer avec les prix attendus
                  if (purchasePricePerUnit > 0) {
                    const diffToGram = Math.abs(purchasePricePerUnit - pricePerGramInEur)
                    const diffToOunce = Math.abs(purchasePricePerUnit - pricePerOnceInEur)
                    
                    if (diffToOunce < diffToGram) {
                      console.log(`✅ Gold detected as ounces (closer to ounce price, diff: ${diffToOunce.toFixed(2)} vs ${diffToGram.toFixed(2)}): returning ${pricePerOnceInEur.toFixed(2)}€/oz`)
                      return pricePerOnceInEur
                    } else {
                      console.log(`✅ Gold detected as grams (closer to gram price, diff: ${diffToGram.toFixed(2)} vs ${diffToOunce.toFixed(2)}): returning ${pricePerGramInEur.toFixed(2)}€/g`)
                      return pricePerGramInEur
                    }
                  }
                }
              }
              
              // Par défaut, retourner le prix par once (comme TradingView)
              console.log(`✅ Gold default: returning price per ounce ${pricePerOnceInEur.toFixed(2)}€/oz (to match TradingView)`)
              return pricePerOnceInEur
            }
            
            // Pour les autres actifs, convertir en EUR si nécessaire
            const currency = data.chart.result[0].meta.currency || 'USD'
            if (currency === 'USD' && price > 0) {
              const usdToEur = await getUsdToEurRate()
              return price * usdToEur
            }
            
            return price
          }
        }
      } catch (error) {
        console.error(`Error fetching price for ${symbol}:`, error)
      }
      return null
    }

    // Récupérer tous les prix en parallèle
    const pricePromises = assets
      .filter(asset => asset.symbol)
      .map(asset => 
        fetchPrice(asset.symbol!, asset.category, asset.tradingViewSymbol, asset.id, asset.name, asset.currency).then(price => ({
          id: asset.id,
          price: price
        }))
      )
    
    const priceResults = await Promise.all(pricePromises)
    
    // Mettre à jour les prix dans la base de données avec la devise correspondante
    const updatePromises = priceResults
      .filter(({ price }) => price !== null)
      .map(async ({ id, price }) => {
        // Récupérer l'investissement pour obtenir le symbole TradingView
        const asset = await prisma.investmentAsset.findUnique({
          where: { id },
          select: { tradingViewSymbol: true, symbol: true }
        })
        
        // Détecter la devise depuis le symbole TradingView
        let detectedCurrency = 'EUR' // Par défaut EUR
        const symbolToCheck = asset?.tradingViewSymbol || asset?.symbol || ''
        const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'CNY', 'INR', 'BRL', 'KRW', 'MXN', 'SGD', 'HKD', 'NZD', 'SEK', 'NOK', 'DKK', 'PLN', 'RUB', 'TRY', 'ZAR', 'THB', 'IDR', 'MYR']
        for (const currency of currencies) {
          if (symbolToCheck.toUpperCase().endsWith(currency)) {
            detectedCurrency = currency
            break
          }
        }
        
        console.log(`💱 Updating asset ${id}: price=${price}, symbolToCheck=${symbolToCheck}, detectedCurrency=${detectedCurrency}`)
        
        // Mettre à jour le prix ET la devise pour qu'ils correspondent
        return prisma.investmentAsset.update({
          where: { id },
          data: {
            currentPrice: price!,
            currency: detectedCurrency, // Mettre à jour la devise pour correspondre au symbole
            lastValuationDate: new Date()
          }
        })
      })

    await Promise.all(updatePromises)

    // Retourner les prix mis à jour
    priceResults.forEach(({ id, price }) => {
      if (price !== null) {
        updatedPrices[id] = price
      }
    })

    return NextResponse.json({
      success: true,
      updatedCount: Object.keys(updatedPrices).length,
      prices: updatedPrices
    })
  } catch (error: any) {
    console.error('Update prices error:', error)
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de la mise à jour des prix' },
      { status: 500 }
    )
  }
}

