import { NextResponse } from 'next/server'
import { getCryptoPriceFromCoinGecko } from '@/lib/crypto-coingecko'

/**
 * GET /api/investments/crypto/price
 * 
 * Paramètres de base:
 * - baseSymbol: Symbole de base (ex: BTC)
 * - quoteSymbol: Devise de cotation (ex: USD)
 * 
 * Paramètres optionnels pour calculer les métriques complètes:
 * - quantity: Quantité de crypto
 * - buyUnitPriceQuote: Prix unitaire d'achat dans la devise quote
 * - fees: Frais dans la devise quote
 * - paidAmount: Montant payé (optionnel)
 * - paidCurrency: Devise payée (optionnel)
 * - purchaseDate: Date d'achat (optionnel, pour taux de change historique)
 * 
 * Retourne:
 * - Si seulement baseSymbol et quoteSymbol: { price, currency, coinGeckoId }
 * - Si tous les paramètres: { currentPrice, currentValue, costBasisQuote, plValue, plPct, currency }
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const baseSymbol = searchParams.get('baseSymbol') || searchParams.get('base_symbol')
    const quoteSymbol = searchParams.get('quoteSymbol') || searchParams.get('quote_currency') || 'USD'
    const quantity = searchParams.get('quantity')
    const buyUnitPriceQuote = searchParams.get('buyUnitPriceQuote')
    const fees = searchParams.get('fees')
    const paidAmount = searchParams.get('paidAmount')
    const paidCurrency = searchParams.get('paidCurrency')
    const purchaseDate = searchParams.get('purchaseDate')

    if (!baseSymbol) {
      return NextResponse.json(
        { error: 'baseSymbol est requis' },
        { status: 400 }
      )
    }

    // Récupérer le prix actuel depuis CoinGecko
    const priceData = await getCryptoPriceFromCoinGecko(baseSymbol, quoteSymbol)

    if (!priceData) {
      return NextResponse.json(
        { error: `Impossible de récupérer le prix pour ${baseSymbol}` },
        { status: 500 }
      )
    }

    const currentPrice = priceData.price
    const finalCurrency = priceData.currency

    // Si tous les paramètres sont fournis, calculer les métriques complètes
    if (quantity && buyUnitPriceQuote) {
      const qty = Number(quantity)
      const buyPrice = Number(buyUnitPriceQuote)
      const feesAmount = Number(fees || 0)

      // Coût total dans la devise quote
      const costBasisQuote = (qty * buyPrice) + feesAmount

      // Valeur actuelle dans la devise quote
      const currentValue = qty * currentPrice

      // Profit/Loss
      const plValue = currentValue - costBasisQuote
      const plPct = costBasisQuote > 0 ? (plValue / costBasisQuote) * 100 : 0

      return NextResponse.json({
        currentPrice,
        currentValue,
        costBasisQuote,
        plValue,
        plPct,
        currency: finalCurrency,
        coinGeckoId: priceData.coinGeckoId
      })
    }

    // Sinon, retourner seulement le prix
    return NextResponse.json({
      price: currentPrice,
      currency: finalCurrency,
      coinGeckoId: priceData.coinGeckoId
    })
  } catch (error: any) {
    console.error('Crypto price GET error:', error)
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de la récupération du prix' },
      { status: 500 }
    )
  }
}


/**
 * GET /api/investments/crypto/price
 * 
 * Paramètres de base:
 * - baseSymbol: Symbole de base (ex: BTC)
 * - quoteSymbol: Devise de cotation (ex: USD)
 * 
 * Paramètres optionnels pour calculer les métriques complètes:
 * - quantity: Quantité de crypto
 * - buyUnitPriceQuote: Prix unitaire d'achat dans la devise quote
 * - fees: Frais dans la devise quote
 * - paidAmount: Montant payé (optionnel)
 * - paidCurrency: Devise payée (optionnel)
 * - purchaseDate: Date d'achat (optionnel, pour taux de change historique)
 * 
 * Retourne:
 * - Si seulement baseSymbol et quoteSymbol: { price, currency, coinGeckoId }
 * - Si tous les paramètres: { currentPrice, currentValue, costBasisQuote, plValue, plPct, currency }
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const baseSymbol = searchParams.get('baseSymbol') || searchParams.get('base_symbol')
    const quoteSymbol = searchParams.get('quoteSymbol') || searchParams.get('quote_currency') || 'USD'
    const quantity = searchParams.get('quantity')
    const buyUnitPriceQuote = searchParams.get('buyUnitPriceQuote')
    const fees = searchParams.get('fees')
    const paidAmount = searchParams.get('paidAmount')
    const paidCurrency = searchParams.get('paidCurrency')
    const purchaseDate = searchParams.get('purchaseDate')

    if (!baseSymbol) {
      return NextResponse.json(
        { error: 'baseSymbol est requis' },
        { status: 400 }
      )
    }

    // Récupérer le prix actuel depuis CoinGecko
    const priceData = await getCryptoPriceFromCoinGecko(baseSymbol, quoteSymbol)

    if (!priceData) {
      return NextResponse.json(
        { error: `Impossible de récupérer le prix pour ${baseSymbol}` },
        { status: 500 }
      )
    }

    const currentPrice = priceData.price
    const finalCurrency = priceData.currency

    // Si tous les paramètres sont fournis, calculer les métriques complètes
    if (quantity && buyUnitPriceQuote) {
      const qty = Number(quantity)
      const buyPrice = Number(buyUnitPriceQuote)
      const feesAmount = Number(fees || 0)

      // Coût total dans la devise quote
      const costBasisQuote = (qty * buyPrice) + feesAmount

      // Valeur actuelle dans la devise quote
      const currentValue = qty * currentPrice

      // Profit/Loss
      const plValue = currentValue - costBasisQuote
      const plPct = costBasisQuote > 0 ? (plValue / costBasisQuote) * 100 : 0

      return NextResponse.json({
        currentPrice,
        currentValue,
        costBasisQuote,
        plValue,
        plPct,
        currency: finalCurrency,
        coinGeckoId: priceData.coinGeckoId
      })
    }

    // Sinon, retourner seulement le prix
    return NextResponse.json({
      price: currentPrice,
      currency: finalCurrency,
      coinGeckoId: priceData.coinGeckoId
    })
  } catch (error: any) {
    console.error('Crypto price GET error:', error)
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de la récupération du prix' },
      { status: 500 }
    )
  }
}
