import { NextResponse } from 'next/server'

// API pour récupérer les prix en temps réel
// Utilise Yahoo Finance (non officiel mais gratuit)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const symbol = searchParams.get('symbol')
    const kind = searchParams.get('kind') || 'stock'

    if (!symbol) {
      return NextResponse.json({ error: 'Symbole manquant' }, { status: 400 })
    }

    let yahooSymbol = symbol.toUpperCase()

    // Convertir les symboles selon le type
    if (kind === 'crypto') {
      // Pour les cryptos, format: BTC-USD
      yahooSymbol = `${symbol.toUpperCase()}-USD`
    } else if (kind === 'etf') {
      // Les ETFs sont généralement déjà au bon format
      yahooSymbol = symbol.toUpperCase()
    } else if (symbol.toUpperCase() === 'OR' || symbol.toUpperCase() === 'GOLD' || symbol.toUpperCase() === 'XAU') {
      // Or - utiliser le symbole Yahoo Finance pour l'or
      yahooSymbol = 'GC=F' // Futures sur l'or (COMEX)
    }

    // Récupérer le prix actuel depuis Yahoo Finance
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1mo`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status} lors de la récupération du prix pour ${yahooSymbol}`)
    }

    const data = await response.json()
    
    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
      throw new Error(`Aucune donnée disponible pour le symbole ${yahooSymbol}. Vérifiez que le symbole est correct.`)
    }

    const result = data.chart.result[0]
    const meta = result.meta
    const timestamps = result.timestamp || []
    const prices = result.indicators?.quote?.[0]?.close || []

    // Prix actuel
    const currentPrice = meta.regularMarketPrice || meta.previousClose || 0

    // Données historiques pour le graphique (30 derniers jours)
    const historicalData = timestamps.map((timestamp: number, index: number) => ({
      date: new Date(timestamp * 1000).toISOString().split('T')[0],
      timestamp: timestamp * 1000,
      price: prices[index] || currentPrice,
      open: result.indicators?.quote?.[0]?.open?.[index] || prices[index] || currentPrice,
      high: result.indicators?.quote?.[0]?.high?.[index] || prices[index] || currentPrice,
      low: result.indicators?.quote?.[0]?.low?.[index] || prices[index] || currentPrice,
      close: prices[index] || currentPrice,
      volume: result.indicators?.quote?.[0]?.volume?.[index] || 0
    })).filter((item: any) => item.price > 0)

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      currentPrice,
      currency: meta.currency || 'USD',
      change: meta.regularMarketChange || 0,
      changePercent: meta.regularMarketChangePercent || 0,
      previousClose: meta.previousClose || currentPrice,
      historicalData
    })
  } catch (error: any) {
    console.error('Price API error:', error)
    const errorMessage = error?.message || 'Impossible de récupérer le prix'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
