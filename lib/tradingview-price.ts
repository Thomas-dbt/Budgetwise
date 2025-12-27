/**
 * Fonction utilitaire pour récupérer le prix depuis TradingView
 * Convertit les symboles TradingView vers Yahoo Finance et récupère les prix
 */

export async function getTradingViewPrice(symbol: string): Promise<{
  price: number
  priceInEur: number
  currency: string
  unit: string
  pricePerGram: number | null
} | null> {
  try {
    // TradingView utilise des symboles spécifiques
    // Pour l'or: XAUUSD (métal spot) - prix en USD par once troy
    let tvSymbol = symbol.toUpperCase()
    
    // Convertir les symboles communs vers TradingView
    if (tvSymbol === 'OR' || tvSymbol === 'GOLD' || tvSymbol === 'XAU' || tvSymbol.includes('OR') || tvSymbol.includes('GOLD')) {
      tvSymbol = 'XAUUSD' // Or en USD (prix par once troy)
    }
    
    // Essayer d'abord de récupérer directement depuis TradingView via leur endpoint de données
    // TradingView utilise souvent des endpoints comme celui-ci pour leurs widgets
    let currentPrice = 0
    let currency = 'USD'
    
    // Essayer l'endpoint TradingView direct pour XAUUSD
    if (tvSymbol === 'XAUUSD' || tvSymbol.includes('XAU')) {
      try {
        // TradingView utilise un endpoint de données pour leurs widgets
        // Essayer l'endpoint de scanner TradingView pour forex/metals
        const tvScannerUrl = `https://scanner.tradingview.com/forex/scan`
        const tvResponse = await fetch(tvScannerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Origin': 'https://www.tradingview.com',
            'Referer': 'https://www.tradingview.com/'
          },
          body: JSON.stringify({
            filter: [{
              left: 'name',
              operation: 'match',
              right: 'XAUUSD'
            }],
            columns: ['name', 'close', 'change', 'change_abs'],
            sort: { sortBy: 'name', sortOrder: 'asc' },
            range: [0, 1]
          }),
          cache: 'no-store'
        })
        
        if (tvResponse.ok) {
          const tvData = await tvResponse.json()
          console.log(`📊 TradingView scanner response:`, JSON.stringify(tvData).substring(0, 200))
          if (tvData.data && tvData.data.length > 0 && tvData.data[0].d && tvData.data[0].d.length > 1) {
            // Le prix est dans la colonne 'close' (index 1)
            currentPrice = parseFloat(tvData.data[0].d[1]) || 0
            if (currentPrice > 0) {
              console.log(`✅ Price from TradingView scanner: ${currentPrice} USD`)
            }
          }
        } else {
          console.log(`⚠️ TradingView scanner returned status ${tvResponse.status}`)
        }
      } catch (tvError: any) {
        console.log(`⚠️ TradingView scanner failed, falling back to Yahoo Finance:`, tvError?.message || tvError)
      }
    }
    
    // Si TradingView n'a pas fonctionné, utiliser Yahoo Finance comme fallback
    if (currentPrice === 0) {
      // Convertir le symbole TradingView vers Yahoo Finance
      let yahooSymbol = tvSymbol
      
      if (tvSymbol === 'XAUUSD' || symbol.toUpperCase().includes('OR') || symbol.toUpperCase().includes('GOLD') || symbol.toUpperCase().includes('XAU')) {
        yahooSymbol = 'GC=F' // Futures COMEX pour l'or (prix en USD par once troy)
      } else if (tvSymbol.includes(':')) {
        // Si c'est un symbole avec exchange (ex: OANDA:XAUUSD)
        const parts = tvSymbol.split(':')
        if (parts[1] === 'XAUUSD' || parts[1]?.includes('XAU')) {
          yahooSymbol = 'GC=F'
        } else {
          yahooSymbol = parts[1] || parts[0]
        }
      }
      
      console.log(`Fetching price for TradingView symbol ${tvSymbol} → Yahoo Finance ${yahooSymbol}`)
      
      // Récupérer le prix depuis Yahoo Finance
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        cache: 'no-store'
      })
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status} pour ${yahooSymbol}`)
      }
      
      const data = await response.json()
      
      if (!data.chart?.result?.[0]?.meta) {
        throw new Error(`Aucune donnée disponible pour ${yahooSymbol}`)
      }
      
      const meta = data.chart.result[0].meta
      currentPrice = meta.regularMarketPrice || meta.previousClose || 0
      currency = meta.currency || 'USD'
      
      console.log(`📊 Raw price from Yahoo Finance: ${currentPrice} ${currency} for ${yahooSymbol}`)
    }
    
    if (currentPrice === 0) {
      throw new Error('Impossible de récupérer le prix')
    }
    
    // Pour l'or (GC=F ou XAUUSD), le prix est en USD par once troy
    // Convertir en EUR
    let priceInEur = currentPrice
    if (currency === 'USD') {
      // Récupérer le taux de change USD/EUR
      try {
        const eurUsdUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/EURUSD=X?interval=1d&range=1d'
        const eurUsdResponse = await fetch(eurUsdUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          cache: 'no-store'
        })
        if (eurUsdResponse.ok) {
          const eurUsdData = await eurUsdResponse.json()
          if (eurUsdData.chart?.result?.[0]?.meta) {
            const eurUsdRate = eurUsdData.chart.result[0].meta.regularMarketPrice || 1.1
            // EURUSD=X donne le taux EUR/USD (ex: 1.1 = 1 EUR = 1.1 USD)
            // Pour convertir USD vers EUR: USD / (EUR/USD) = EUR
            priceInEur = currentPrice / eurUsdRate
            console.log(`💱 Conversion USD→EUR: ${currentPrice.toFixed(2)}$ / ${eurUsdRate.toFixed(4)} = ${priceInEur.toFixed(2)}€`)
          }
        }
      } catch (error) {
        console.error('❌ Error fetching EUR/USD rate:', error)
        // Utiliser un taux par défaut
        priceInEur = currentPrice * 0.92
        console.log(`⚠️ Using default rate: ${currentPrice.toFixed(2)}$ * 0.92 = ${priceInEur.toFixed(2)}€`)
      }
    }
    
    return {
      price: currentPrice,
      priceInEur: priceInEur,
      currency: currency,
      tradingViewSymbol: tvSymbol === 'XAUUSD' ? 'XAUUSD' : tvSymbol,
      unit: (tvSymbol === 'XAUUSD' || tvSymbol.includes('XAU')) ? 'once_troy' : 'unit',
      pricePerGram: (tvSymbol === 'XAUUSD' || tvSymbol.includes('XAU')) ? priceInEur / 31.1035 : null
    }
  } catch (error: any) {
    console.error('TradingView price error:', error)
    return null
  }
}



 * Convertit les symboles TradingView vers Yahoo Finance et récupère les prix
 */

export async function getTradingViewPrice(symbol: string): Promise<{
  price: number
  priceInEur: number
  currency: string
  unit: string
  pricePerGram: number | null
} | null> {
  try {
    // TradingView utilise des symboles spécifiques
    // Pour l'or: XAUUSD (métal spot) - prix en USD par once troy
    let tvSymbol = symbol.toUpperCase()
    
    // Convertir les symboles communs vers TradingView
    if (tvSymbol === 'OR' || tvSymbol === 'GOLD' || tvSymbol === 'XAU' || tvSymbol.includes('OR') || tvSymbol.includes('GOLD')) {
      tvSymbol = 'XAUUSD' // Or en USD (prix par once troy)
    }
    
    // Essayer d'abord de récupérer directement depuis TradingView via leur endpoint de données
    // TradingView utilise souvent des endpoints comme celui-ci pour leurs widgets
    let currentPrice = 0
    let currency = 'USD'
    
    // Essayer l'endpoint TradingView direct pour XAUUSD
    if (tvSymbol === 'XAUUSD' || tvSymbol.includes('XAU')) {
      try {
        // TradingView utilise un endpoint de données pour leurs widgets
        // Essayer l'endpoint de scanner TradingView pour forex/metals
        const tvScannerUrl = `https://scanner.tradingview.com/forex/scan`
        const tvResponse = await fetch(tvScannerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Origin': 'https://www.tradingview.com',
            'Referer': 'https://www.tradingview.com/'
          },
          body: JSON.stringify({
            filter: [{
              left: 'name',
              operation: 'match',
              right: 'XAUUSD'
            }],
            columns: ['name', 'close', 'change', 'change_abs'],
            sort: { sortBy: 'name', sortOrder: 'asc' },
            range: [0, 1]
          }),
          cache: 'no-store'
        })
        
        if (tvResponse.ok) {
          const tvData = await tvResponse.json()
          console.log(`📊 TradingView scanner response:`, JSON.stringify(tvData).substring(0, 200))
          if (tvData.data && tvData.data.length > 0 && tvData.data[0].d && tvData.data[0].d.length > 1) {
            // Le prix est dans la colonne 'close' (index 1)
            currentPrice = parseFloat(tvData.data[0].d[1]) || 0
            if (currentPrice > 0) {
              console.log(`✅ Price from TradingView scanner: ${currentPrice} USD`)
            }
          }
        } else {
          console.log(`⚠️ TradingView scanner returned status ${tvResponse.status}`)
        }
      } catch (tvError: any) {
        console.log(`⚠️ TradingView scanner failed, falling back to Yahoo Finance:`, tvError?.message || tvError)
      }
    }
    
    // Si TradingView n'a pas fonctionné, utiliser Yahoo Finance comme fallback
    if (currentPrice === 0) {
      // Convertir le symbole TradingView vers Yahoo Finance
      let yahooSymbol = tvSymbol
      
      if (tvSymbol === 'XAUUSD' || symbol.toUpperCase().includes('OR') || symbol.toUpperCase().includes('GOLD') || symbol.toUpperCase().includes('XAU')) {
        yahooSymbol = 'GC=F' // Futures COMEX pour l'or (prix en USD par once troy)
      } else if (tvSymbol.includes(':')) {
        // Si c'est un symbole avec exchange (ex: OANDA:XAUUSD)
        const parts = tvSymbol.split(':')
        if (parts[1] === 'XAUUSD' || parts[1]?.includes('XAU')) {
          yahooSymbol = 'GC=F'
        } else {
          yahooSymbol = parts[1] || parts[0]
        }
      }
      
      console.log(`Fetching price for TradingView symbol ${tvSymbol} → Yahoo Finance ${yahooSymbol}`)
      
      // Récupérer le prix depuis Yahoo Finance
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        cache: 'no-store'
      })
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status} pour ${yahooSymbol}`)
      }
      
      const data = await response.json()
      
      if (!data.chart?.result?.[0]?.meta) {
        throw new Error(`Aucune donnée disponible pour ${yahooSymbol}`)
      }
      
      const meta = data.chart.result[0].meta
      currentPrice = meta.regularMarketPrice || meta.previousClose || 0
      currency = meta.currency || 'USD'
      
      console.log(`📊 Raw price from Yahoo Finance: ${currentPrice} ${currency} for ${yahooSymbol}`)
    }
    
    if (currentPrice === 0) {
      throw new Error('Impossible de récupérer le prix')
    }
    
    // Pour l'or (GC=F ou XAUUSD), le prix est en USD par once troy
    // Convertir en EUR
    let priceInEur = currentPrice
    if (currency === 'USD') {
      // Récupérer le taux de change USD/EUR
      try {
        const eurUsdUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/EURUSD=X?interval=1d&range=1d'
        const eurUsdResponse = await fetch(eurUsdUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          cache: 'no-store'
        })
        if (eurUsdResponse.ok) {
          const eurUsdData = await eurUsdResponse.json()
          if (eurUsdData.chart?.result?.[0]?.meta) {
            const eurUsdRate = eurUsdData.chart.result[0].meta.regularMarketPrice || 1.1
            // EURUSD=X donne le taux EUR/USD (ex: 1.1 = 1 EUR = 1.1 USD)
            // Pour convertir USD vers EUR: USD / (EUR/USD) = EUR
            priceInEur = currentPrice / eurUsdRate
            console.log(`💱 Conversion USD→EUR: ${currentPrice.toFixed(2)}$ / ${eurUsdRate.toFixed(4)} = ${priceInEur.toFixed(2)}€`)
          }
        }
      } catch (error) {
        console.error('❌ Error fetching EUR/USD rate:', error)
        // Utiliser un taux par défaut
        priceInEur = currentPrice * 0.92
        console.log(`⚠️ Using default rate: ${currentPrice.toFixed(2)}$ * 0.92 = ${priceInEur.toFixed(2)}€`)
      }
    }
    
    return {
      price: currentPrice,
      priceInEur: priceInEur,
      currency: currency,
      tradingViewSymbol: tvSymbol === 'XAUUSD' ? 'XAUUSD' : tvSymbol,
      unit: (tvSymbol === 'XAUUSD' || tvSymbol.includes('XAU')) ? 'once_troy' : 'unit',
      pricePerGram: (tvSymbol === 'XAUUSD' || tvSymbol.includes('XAU')) ? priceInEur / 31.1035 : null
    }
  } catch (error: any) {
    console.error('TradingView price error:', error)
    return null
  }
}


