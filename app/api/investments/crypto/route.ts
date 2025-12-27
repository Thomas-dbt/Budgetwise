import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'
import { getCryptoPriceFromCoinGecko } from '@/lib/crypto-coingecko'

/**
 * POST /api/investments/crypto
 * Crée un investissement crypto avec calcul automatique des métriques
 * 
 * Body:
 * {
 *   name: string (ex: "Bitcoin")
 *   base_symbol: string (ex: "BTC")
 *   quote_currency: string (ex: "USD" ou "EUR")
 *   platform: string (ex: "Binance")
 *   quantity_base: number (ex: 0.15)
 *   buy_date: string (ISO date)
 *   buy_unit_price_quote: number (ex: 50000) - prix unitaire dans la devise quote
 *   fees?: number (optionnel)
 *   paid_amount?: number (optionnel - si payé dans une autre devise)
 *   paid_currency?: string (optionnel - ex: "EUR")
 *   fx_paid_to_quote?: number (optionnel - taux de change au moment de l'achat)
 *   price_source?: string (défaut: "coingecko")
 *   notes?: string (optionnel)
 * }
 */
export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json()

    // Validation des champs obligatoires
    const {
      name,
      base_symbol,
      quote_currency,
      platform,
      quantity_base,
      buy_date,
      buy_unit_price_quote,
      fees = 0,
      paid_amount,
      paid_currency,
      fx_paid_to_quote,
      price_source = 'coingecko',
      notes
    } = body

    if (!name || !base_symbol || !quote_currency || !platform || !quantity_base || !buy_date || !buy_unit_price_quote) {
      return NextResponse.json(
        { error: 'Champs obligatoires manquants: name, base_symbol, quote_currency, platform, quantity_base, buy_date, buy_unit_price_quote' },
        { status: 400 }
      )
    }

    // Récupérer le prix actuel depuis CoinGecko
    const currentPriceData = await getCryptoPriceFromCoinGecko(base_symbol, quote_currency)
    if (!currentPriceData) {
      return NextResponse.json(
        { error: `Impossible de récupérer le prix actuel pour ${base_symbol}` },
        { status: 500 }
      )
    }

    const currentPrice = currentPriceData.price
    const finalQuoteCurrency = currentPriceData.currency

    // Calculs des métriques
    const quantity = Number(quantity_base)
    const buyPrice = Number(buy_unit_price_quote)
    const feesAmount = Number(fees) || 0

    // Coût total dans la devise quote
    const costBasisQuote = (quantity * buyPrice) + feesAmount

    // Valeur actuelle dans la devise quote
    const currentValue = quantity * currentPrice

    // Profit/Loss
    const plValue = currentValue - costBasisQuote
    const plPct = costBasisQuote > 0 ? (plValue / costBasisQuote) * 100 : 0

    // Créer le symbole de trading (ex: BTCUSD)
    const tradingSymbol = `${base_symbol.toUpperCase()}${finalQuoteCurrency}`

    // Créer l'investissement
    const asset = await prisma.investmentAsset.create({
      data: {
        userId,
        name,
        symbol: tradingSymbol,
        category: 'Crypto',
        platform,
        currency: finalQuoteCurrency,
        comment: notes || null,
        valuationMode: 'marché',
        priceProvider: price_source,
        baseSymbol: base_symbol.toUpperCase(),
        quoteSymbol: finalQuoteCurrency,
        tradingViewSymbol: tradingSymbol,
        quantity,
        currentPrice,
        currentValue,
        amountInvested: costBasisQuote,
        lastValuationDate: new Date()
      }
    })

    // Créer la position avec les détails de transaction
    const purchaseDate = new Date(buy_date)
    const position = await prisma.position.create({
      data: {
        assetId: asset.id,
        quantity,
        costBasis: buyPrice,
        paidAmount: paid_amount ? Number(paid_amount) : null,
        paidCurrency: paid_currency || null,
        purchaseDate,
        fxRateToQuote: fx_paid_to_quote ? Number(fx_paid_to_quote) : null
      }
    })

    // Créer un snapshot de prix
    await prisma.priceSnapshot.create({
      data: {
        assetId: asset.id,
        quoteCurrency: finalQuoteCurrency,
        price: currentPrice,
        timestamp: new Date()
      }
    })

    return NextResponse.json({
      asset: {
        id: asset.id,
        name: asset.name,
        symbol: asset.symbol,
        baseSymbol: asset.baseSymbol,
        quoteSymbol: asset.quoteSymbol,
        tradingSymbol,
        platform: asset.platform,
        currency: asset.currency
      },
      position: {
        id: position.id,
        quantity: position.quantity.toString(),
        costBasis: position.costBasis.toString()
      },
      metrics: {
        currentPrice,
        currentValue,
        costBasisQuote,
        plValue,
        plPct,
        quantity,
        buyPrice,
        currency: finalQuoteCurrency
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('Crypto investment POST error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: error?.message || 'Impossible de créer l\'investissement crypto' },
      { status }
    )
  }
}



import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'
import { getCryptoPriceFromCoinGecko } from '@/lib/crypto-coingecko'

/**
 * POST /api/investments/crypto
 * Crée un investissement crypto avec calcul automatique des métriques
 * 
 * Body:
 * {
 *   name: string (ex: "Bitcoin")
 *   base_symbol: string (ex: "BTC")
 *   quote_currency: string (ex: "USD" ou "EUR")
 *   platform: string (ex: "Binance")
 *   quantity_base: number (ex: 0.15)
 *   buy_date: string (ISO date)
 *   buy_unit_price_quote: number (ex: 50000) - prix unitaire dans la devise quote
 *   fees?: number (optionnel)
 *   paid_amount?: number (optionnel - si payé dans une autre devise)
 *   paid_currency?: string (optionnel - ex: "EUR")
 *   fx_paid_to_quote?: number (optionnel - taux de change au moment de l'achat)
 *   price_source?: string (défaut: "coingecko")
 *   notes?: string (optionnel)
 * }
 */
export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json()

    // Validation des champs obligatoires
    const {
      name,
      base_symbol,
      quote_currency,
      platform,
      quantity_base,
      buy_date,
      buy_unit_price_quote,
      fees = 0,
      paid_amount,
      paid_currency,
      fx_paid_to_quote,
      price_source = 'coingecko',
      notes
    } = body

    if (!name || !base_symbol || !quote_currency || !platform || !quantity_base || !buy_date || !buy_unit_price_quote) {
      return NextResponse.json(
        { error: 'Champs obligatoires manquants: name, base_symbol, quote_currency, platform, quantity_base, buy_date, buy_unit_price_quote' },
        { status: 400 }
      )
    }

    // Récupérer le prix actuel depuis CoinGecko
    const currentPriceData = await getCryptoPriceFromCoinGecko(base_symbol, quote_currency)
    if (!currentPriceData) {
      return NextResponse.json(
        { error: `Impossible de récupérer le prix actuel pour ${base_symbol}` },
        { status: 500 }
      )
    }

    const currentPrice = currentPriceData.price
    const finalQuoteCurrency = currentPriceData.currency

    // Calculs des métriques
    const quantity = Number(quantity_base)
    const buyPrice = Number(buy_unit_price_quote)
    const feesAmount = Number(fees) || 0

    // Coût total dans la devise quote
    const costBasisQuote = (quantity * buyPrice) + feesAmount

    // Valeur actuelle dans la devise quote
    const currentValue = quantity * currentPrice

    // Profit/Loss
    const plValue = currentValue - costBasisQuote
    const plPct = costBasisQuote > 0 ? (plValue / costBasisQuote) * 100 : 0

    // Créer le symbole de trading (ex: BTCUSD)
    const tradingSymbol = `${base_symbol.toUpperCase()}${finalQuoteCurrency}`

    // Créer l'investissement
    const asset = await prisma.investmentAsset.create({
      data: {
        userId,
        name,
        symbol: tradingSymbol,
        category: 'Crypto',
        platform,
        currency: finalQuoteCurrency,
        comment: notes || null,
        valuationMode: 'marché',
        priceProvider: price_source,
        baseSymbol: base_symbol.toUpperCase(),
        quoteSymbol: finalQuoteCurrency,
        tradingViewSymbol: tradingSymbol,
        quantity,
        currentPrice,
        currentValue,
        amountInvested: costBasisQuote,
        lastValuationDate: new Date()
      }
    })

    // Créer la position avec les détails de transaction
    const purchaseDate = new Date(buy_date)
    const position = await prisma.position.create({
      data: {
        assetId: asset.id,
        quantity,
        costBasis: buyPrice,
        paidAmount: paid_amount ? Number(paid_amount) : null,
        paidCurrency: paid_currency || null,
        purchaseDate,
        fxRateToQuote: fx_paid_to_quote ? Number(fx_paid_to_quote) : null
      }
    })

    // Créer un snapshot de prix
    await prisma.priceSnapshot.create({
      data: {
        assetId: asset.id,
        quoteCurrency: finalQuoteCurrency,
        price: currentPrice,
        timestamp: new Date()
      }
    })

    return NextResponse.json({
      asset: {
        id: asset.id,
        name: asset.name,
        symbol: asset.symbol,
        baseSymbol: asset.baseSymbol,
        quoteSymbol: asset.quoteSymbol,
        tradingSymbol,
        platform: asset.platform,
        currency: asset.currency
      },
      position: {
        id: position.id,
        quantity: position.quantity.toString(),
        costBasis: position.costBasis.toString()
      },
      metrics: {
        currentPrice,
        currentValue,
        costBasisQuote,
        plValue,
        plPct,
        quantity,
        buyPrice,
        currency: finalQuoteCurrency
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('Crypto investment POST error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: error?.message || 'Impossible de créer l\'investissement crypto' },
      { status }
    )
  }
}









