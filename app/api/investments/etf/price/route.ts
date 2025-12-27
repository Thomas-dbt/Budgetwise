import { NextResponse } from 'next/server'
import { getETFPrice } from '@/lib/etf-price'

/**
 * GET /api/investments/etf/price
 * Récupère le prix actuel d'un ETF et calcule les métriques si les paramètres sont fournis
 * 
 * Query params:
 * - isin?: string (prioritaire)
 * - ticker?: string (si pas d'ISIN)
 * - currency_quote?: string (défaut: "EUR")
 * - quantity_parts?: number (pour calculer current_value)
 * - buy_unit_price?: number (pour calculer cost_basis)
 * - fees?: number (pour calculer cost_basis)
 * 
 * Retourne:
 * - Si seulement isin/ticker + currency_quote: { currentPrice }
 * - Si tous les paramètres: { currentPrice, currentValue, costBasis, plValue, plPct }
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    
    const isin = searchParams.get('isin') || undefined
    const ticker = searchParams.get('ticker') || undefined
    const currencyQuote = searchParams.get('currency_quote') || 'EUR'
    const quantityParts = searchParams.get('quantity_parts')
    const buyUnitPrice = searchParams.get('buy_unit_price')
    const fees = searchParams.get('fees') || '0'

    // Validation: au moins ISIN ou ticker doit être fourni
    if (!isin && !ticker) {
      return NextResponse.json(
        { error: 'ISIN ou ticker requis' },
        { status: 400 }
      )
    }

    // Récupérer le prix actuel
    const priceData = await getETFPrice(isin, ticker, currencyQuote)
    if (!priceData) {
      return NextResponse.json(
        { error: `Impossible de récupérer le prix pour l'ETF ${isin || ticker}` },
        { status: 500 }
      )
    }

    const currentPrice = priceData.price

    // Si seulement le prix est demandé (sans calculs de métriques)
    if (!quantityParts || !buyUnitPrice) {
      return NextResponse.json({
        currentPrice,
        currency: priceData.currency
      })
    }

    // Calculer les métriques complètes
    const quantity = Number(quantityParts)
    const buyPrice = Number(buyUnitPrice)
    const feesAmount = Number(fees) || 0

    const costBasis = (quantity * buyPrice) + feesAmount
    const currentValue = quantity * currentPrice
    const plValue = currentValue - costBasis
    const plPct = costBasis > 0 ? (plValue / costBasis) * 100 : 0

    return NextResponse.json({
      currentPrice,
      currentValue,
      costBasis,
      plValue,
      plPct,
      currency: priceData.currency
    })
  } catch (error: any) {
    console.error('ETF price GET error:', error)
    return NextResponse.json(
      { error: error?.message || 'Impossible de récupérer le prix de l\'ETF' },
      { status: 500 }
    )
  }
}


import { getETFPrice } from '@/lib/etf-price'

/**
 * GET /api/investments/etf/price
 * Récupère le prix actuel d'un ETF et calcule les métriques si les paramètres sont fournis
 * 
 * Query params:
 * - isin?: string (prioritaire)
 * - ticker?: string (si pas d'ISIN)
 * - currency_quote?: string (défaut: "EUR")
 * - quantity_parts?: number (pour calculer current_value)
 * - buy_unit_price?: number (pour calculer cost_basis)
 * - fees?: number (pour calculer cost_basis)
 * 
 * Retourne:
 * - Si seulement isin/ticker + currency_quote: { currentPrice }
 * - Si tous les paramètres: { currentPrice, currentValue, costBasis, plValue, plPct }
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    
    const isin = searchParams.get('isin') || undefined
    const ticker = searchParams.get('ticker') || undefined
    const currencyQuote = searchParams.get('currency_quote') || 'EUR'
    const quantityParts = searchParams.get('quantity_parts')
    const buyUnitPrice = searchParams.get('buy_unit_price')
    const fees = searchParams.get('fees') || '0'

    // Validation: au moins ISIN ou ticker doit être fourni
    if (!isin && !ticker) {
      return NextResponse.json(
        { error: 'ISIN ou ticker requis' },
        { status: 400 }
      )
    }

    // Récupérer le prix actuel
    const priceData = await getETFPrice(isin, ticker, currencyQuote)
    if (!priceData) {
      return NextResponse.json(
        { error: `Impossible de récupérer le prix pour l'ETF ${isin || ticker}` },
        { status: 500 }
      )
    }

    const currentPrice = priceData.price

    // Si seulement le prix est demandé (sans calculs de métriques)
    if (!quantityParts || !buyUnitPrice) {
      return NextResponse.json({
        currentPrice,
        currency: priceData.currency
      })
    }

    // Calculer les métriques complètes
    const quantity = Number(quantityParts)
    const buyPrice = Number(buyUnitPrice)
    const feesAmount = Number(fees) || 0

    const costBasis = (quantity * buyPrice) + feesAmount
    const currentValue = quantity * currentPrice
    const plValue = currentValue - costBasis
    const plPct = costBasis > 0 ? (plValue / costBasis) * 100 : 0

    return NextResponse.json({
      currentPrice,
      currentValue,
      costBasis,
      plValue,
      plPct,
      currency: priceData.currency
    })
  } catch (error: any) {
    console.error('ETF price GET error:', error)
    return NextResponse.json(
      { error: error?.message || 'Impossible de récupérer le prix de l\'ETF' },
      { status: 500 }
    )
  }
}








