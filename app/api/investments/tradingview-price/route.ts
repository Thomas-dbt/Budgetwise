import { NextResponse } from 'next/server'
import { getTradingViewPrice } from '@/lib/tradingview-price'

/**
 * Récupère le prix depuis TradingView
 * Utilise le widget TradingView pour obtenir les données de prix
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const symbol = searchParams.get('symbol')
    
    if (!symbol) {
      return NextResponse.json({ error: 'Symbole manquant' }, { status: 400 })
    }

    const priceData = await getTradingViewPrice(symbol)
    
    if (!priceData) {
      return NextResponse.json(
        { error: 'Impossible de récupérer le prix' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(priceData)
  } catch (error: any) {
    console.error('TradingView price API error:', error)
    return NextResponse.json(
      { error: error?.message || 'Impossible de récupérer le prix' },
      { status: 500 }
    )
  }
}


/**
 * Récupère le prix depuis TradingView
 * Utilise le widget TradingView pour obtenir les données de prix
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const symbol = searchParams.get('symbol')
    
    if (!symbol) {
      return NextResponse.json({ error: 'Symbole manquant' }, { status: 400 })
    }

    const priceData = await getTradingViewPrice(symbol)
    
    if (!priceData) {
      return NextResponse.json(
        { error: 'Impossible de récupérer le prix' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(priceData)
  } catch (error: any) {
    console.error('TradingView price API error:', error)
    return NextResponse.json(
      { error: error?.message || 'Impossible de récupérer le prix' },
      { status: 500 }
    )
  }
}
