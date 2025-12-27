/**
 * Fonction utilitaire pour récupérer les prix depuis CoinGecko
 * Utilise directement le symbole TradingView (ex: BTCUSD, XAUUSD, etc.)
 */

interface CoinGeckoPriceResult {
  price: number // Prix dans la devise du symbole
  currency: string // Devise détectée depuis le symbole
  unit: string
  pricePerGram: number | null
  tradingViewSymbol: string
}

/**
 * Récupère le prix depuis CoinGecko en utilisant directement le symbole TradingView
 * @param symbol Symbole TradingView (ex: BTCUSD, XAUUSD, BTCEUR, etc.)
 * @returns Prix dans la devise du symbole
 */
export async function getCoinGeckoPrice(
  symbol: string
): Promise<CoinGeckoPriceResult | null> {
  try {
    const upperSymbol = symbol.toUpperCase()

    // Détecter la devise depuis le symbole (ex: BTCUSD -> USD, BTCEUR -> EUR)
    let detectedCurrency = 'USD' // Par défaut USD
    const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'CNY', 'INR', 'BRL', 'KRW', 'MXN', 'SGD', 'HKD', 'NZD', 'SEK', 'NOK', 'DKK', 'PLN', 'RUB', 'TRY', 'ZAR', 'THB', 'IDR', 'MYR']
    for (const currency of currencies) {
      if (upperSymbol.endsWith(currency)) {
        detectedCurrency = currency
        break
      }
    }

    // Extraire l'actif de base (ex: BTCUSD -> BTC, XAUUSD -> XAU)
    let assetSymbol = upperSymbol
    for (const currency of currencies) {
      assetSymbol = assetSymbol.replace(new RegExp(`${currency}$`), '')
    }

    // Mapper vers CoinGecko ID
    let coinGeckoId = ''
    let tradingViewSymbol = symbol

    if (assetSymbol === 'XAU' || assetSymbol === 'OR' || assetSymbol === 'GOLD' || upperSymbol.includes('XAU') || upperSymbol.includes('GOLD')) {
      // CoinGecko utilise "gold" comme ID pour l'or
      coinGeckoId = 'gold'
      // Pour l'or, s'assurer que la devise est bien détectée depuis le symbole
      // Si le symbole est XAUUSD, detectedCurrency devrait être USD
      tradingViewSymbol = `XAU${detectedCurrency}`
      console.log(`🏅 Gold detected: symbol=${symbol}, assetSymbol=${assetSymbol}, detectedCurrency=${detectedCurrency}, coinGeckoId=${coinGeckoId}`)
    } else if (assetSymbol === 'BTC' || assetSymbol === 'BITCOIN' || upperSymbol.includes('BTC')) {
      coinGeckoId = 'bitcoin'
      tradingViewSymbol = `BTC${detectedCurrency}`
    } else if (assetSymbol === 'ETH' || assetSymbol === 'ETHEREUM' || upperSymbol.includes('ETH')) {
      coinGeckoId = 'ethereum'
      tradingViewSymbol = `ETH${detectedCurrency}`
    } else {
      // Essayer avec le symbole tel quel (CoinGecko supporte beaucoup de cryptos)
      coinGeckoId = assetSymbol.toLowerCase()
      tradingViewSymbol = symbol
    }

    if (!coinGeckoId) {
      console.error(`❌ CoinGecko: No ID found for symbol ${symbol}`)
      return null
    }

    console.log(`🔍 CoinGecko: Fetching price for ${coinGeckoId} (symbol: ${symbol}, detectedCurrency: ${detectedCurrency})`)
    console.log(`🔍 Symbol breakdown: upperSymbol=${upperSymbol}, assetSymbol=${assetSymbol}, detectedCurrency=${detectedCurrency}`)

    // Récupérer le prix depuis CoinGecko dans la devise détectée
    // Toujours récupérer USD et EUR pour avoir des fallbacks
    const currencyLower = detectedCurrency.toLowerCase()
    const currenciesToFetch = currencyLower === 'usd' ? 'usd,eur' : `${currencyLower},usd,eur`
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinGeckoId}&vs_currencies=${currenciesToFetch}`

    console.log(`📡 CoinGecko API URL: ${url}`)

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ CoinGecko API error ${response.status}:`, errorText)
      throw new Error(`Erreur HTTP ${response.status} pour CoinGecko ${coinGeckoId}: ${errorText}`)
    }

    const data = await response.json()

    console.log(`📊 CoinGecko raw response:`, JSON.stringify(data))

    if (!data[coinGeckoId]) {
      throw new Error(`Aucune donnée disponible pour ${coinGeckoId}`)
    }

    const priceData = data[coinGeckoId]
    console.log(`💰 CoinGecko price data:`, JSON.stringify(priceData))
    console.log(`💰 All available currencies in response:`, Object.keys(priceData))

    // Récupérer le prix dans la devise demandée
    let price = priceData[currencyLower] || 0
    let finalCurrency = detectedCurrency

    console.log(`💰 Trying to get price in ${detectedCurrency} (${currencyLower}): ${price}`)

    // Si le prix n'est pas disponible dans la devise demandée, utiliser USD (priorité) puis EUR
    if (price === 0 || !priceData[currencyLower]) {
      console.log(`⚠️ Price not found in ${detectedCurrency}, trying fallback...`)
      if (priceData.usd) {
        price = priceData.usd
        finalCurrency = 'USD'
        console.log(`✅ Using USD fallback price: ${price}`)
      } else if (priceData.eur) {
        price = priceData.eur
        finalCurrency = 'EUR'
        console.log(`✅ Using EUR fallback price: ${price}`)
      } else {
        // Essayer n'importe quelle devise disponible
        const availableCurrency = Object.keys(priceData).find(key => priceData[key] > 0)
        if (availableCurrency) {
          price = priceData[availableCurrency]
          finalCurrency = availableCurrency.toUpperCase()
          console.log(`✅ Using available currency ${finalCurrency}: ${price}`)
        }
      }
    }

    if (price === 0 || !price) {
      console.error(`❌ No valid price found. PriceData:`, JSON.stringify(priceData))
      throw new Error(`Prix invalide pour ${coinGeckoId} en ${detectedCurrency} (priceData: ${JSON.stringify(priceData)})`)
    }

    console.log(`✅ CoinGecko: ${coinGeckoId} = ${price.toFixed(2)}${finalCurrency} (NO CONVERSION, DIRECT FROM API)`)

    // Pour l'or, CoinGecko retourne le prix par once troy
    const isGold = coinGeckoId === 'gold'
    if (isGold) {
      const pricePerGram = price / 31.1035 // 1 once troy = 31.1035 grammes
      return {
        price: price,
        currency: finalCurrency, // Utiliser la devise finale (peut être différente de detectedCurrency si fallback)
        unit: 'once_troy',
        pricePerGram: pricePerGram,
        tradingViewSymbol: `XAU${finalCurrency}`
      }
    }

    // Pour les cryptos
    return {
      price: price,
      currency: finalCurrency, // Utiliser la devise finale
      unit: 'unit',
      pricePerGram: null,
      tradingViewSymbol: tradingViewSymbol
    }
  } catch (error: any) {
    console.error(`❌ CoinGecko price error for ${symbol}:`, error?.message || error)
    return null
  }
}
