import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'
import { getETFPrice } from '@/lib/etf-price'

/**
 * POST /api/investments/etf
 * Crée un investissement ETF avec calcul automatique des métriques
 * 
 * Body:
 * {
 *   name: string (ex: "Amundi MSCI World")
 *   isin?: string (prioritaire, ex: "FR0010315770")
 *   ticker?: string (optionnel si ISIN, ex: "CW8")
 *   platform: string (ex: "BoursoBank")
 *   quantity_parts: number (ex: 10.5)
 *   buy_date: string (ISO date)
 *   buy_unit_price: number (ex: 50.00) - prix unitaire dans currency_quote
 *   currency_quote: string (ex: "EUR" ou "USD")
 *   fees?: number (optionnel)
 *   distribution_type?: string (optionnel: "ACC" ou "DIST")
 *   envelope?: string (optionnel: "PEA", "CTO", "AV")
 *   benchmark?: string (optionnel: "MSCI World")
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
      isin,
      ticker,
      platform,
      quantity_parts,
      buy_date,
      buy_unit_price,
      currency_quote = 'EUR',
      fees = 0,
      distribution_type,
      envelope,
      benchmark,
      notes
    } = body

    // Validation: au moins ISIN ou ticker doit être fourni
    if (!name || (!isin && !ticker) || !platform || !quantity_parts || !buy_date || !buy_unit_price) {
      return NextResponse.json(
        { error: 'Champs obligatoires manquants: name, (isin ou ticker), platform, quantity_parts, buy_date, buy_unit_price' },
        { status: 400 }
      )
    }

    // Récupérer le prix actuel depuis le provider
    const currentPriceData = await getETFPrice(isin, ticker, currency_quote)
    if (!currentPriceData) {
      return NextResponse.json(
        { error: `Impossible de récupérer le prix actuel pour l'ETF ${isin || ticker}` },
        { status: 500 }
      )
    }

    const currentPrice = currentPriceData.price
    const finalCurrency = currentPriceData.currency

    // Calculs des métriques
    const quantity = Number(quantity_parts)
    const buyPrice = Number(buy_unit_price)
    const feesAmount = Number(fees) || 0

    // Coût total dans la devise quote
    const costBasis = (quantity * buyPrice) + feesAmount

    // Valeur actuelle dans la devise quote
    const currentValue = quantity * currentPrice

    // Profit/Loss
    const plValue = currentValue - costBasis
    const plPct = costBasis > 0 ? (plValue / costBasis) * 100 : 0

    // Créer le symbole de trading (ISIN ou ticker)
    const tradingSymbol = isin || ticker || 'UNKNOWN'

    // Créer l'investissement
    const asset = await prisma.investmentAsset.create({
      data: {
        userId,
        name,
        symbol: tradingSymbol,
        category: 'ETF',
        platform,
        currency: finalCurrency,
        comment: notes || null,
        valuationMode: 'marché',
        priceProvider: 'placeholder', // TODO: mettre à jour avec le vrai provider
        baseSymbol: ticker || isin?.substring(0, 6) || null,
        quoteSymbol: finalCurrency,
        tradingViewSymbol: tradingSymbol,
        quantity,
        currentPrice,
        currentValue,
        amountInvested: costBasis,
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
        paidAmount: costBasis,
        paidCurrency: finalCurrency,
        purchaseDate,
        fxRateToQuote: null
      }
    })

    // Créer un snapshot de prix
    await prisma.priceSnapshot.create({
      data: {
        assetId: asset.id,
        quoteCurrency: finalCurrency,
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
        costBasis,
        plValue,
        plPct,
        quantity,
        buyPrice,
        currency: finalCurrency
      },
      metadata: {
        isin: isin || null,
        ticker: ticker || null,
        distributionType: distribution_type || null,
        envelope: envelope || null,
        benchmark: benchmark || null
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('ETF investment POST error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: error?.message || 'Impossible de créer l\'investissement ETF' },
      { status }
    )
  }
}


import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'
import { getETFPrice } from '@/lib/etf-price'

/**
 * POST /api/investments/etf
 * Crée un investissement ETF avec calcul automatique des métriques
 * 
 * Body:
 * {
 *   name: string (ex: "Amundi MSCI World")
 *   isin?: string (prioritaire, ex: "FR0010315770")
 *   ticker?: string (optionnel si ISIN, ex: "CW8")
 *   platform: string (ex: "BoursoBank")
 *   quantity_parts: number (ex: 10.5)
 *   buy_date: string (ISO date)
 *   buy_unit_price: number (ex: 50.00) - prix unitaire dans currency_quote
 *   currency_quote: string (ex: "EUR" ou "USD")
 *   fees?: number (optionnel)
 *   distribution_type?: string (optionnel: "ACC" ou "DIST")
 *   envelope?: string (optionnel: "PEA", "CTO", "AV")
 *   benchmark?: string (optionnel: "MSCI World")
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
      isin,
      ticker,
      platform,
      quantity_parts,
      buy_date,
      buy_unit_price,
      currency_quote = 'EUR',
      fees = 0,
      distribution_type,
      envelope,
      benchmark,
      notes
    } = body

    // Validation: au moins ISIN ou ticker doit être fourni
    if (!name || (!isin && !ticker) || !platform || !quantity_parts || !buy_date || !buy_unit_price) {
      return NextResponse.json(
        { error: 'Champs obligatoires manquants: name, (isin ou ticker), platform, quantity_parts, buy_date, buy_unit_price' },
        { status: 400 }
      )
    }

    // Récupérer le prix actuel depuis le provider
    const currentPriceData = await getETFPrice(isin, ticker, currency_quote)
    if (!currentPriceData) {
      return NextResponse.json(
        { error: `Impossible de récupérer le prix actuel pour l'ETF ${isin || ticker}` },
        { status: 500 }
      )
    }

    const currentPrice = currentPriceData.price
    const finalCurrency = currentPriceData.currency

    // Calculs des métriques
    const quantity = Number(quantity_parts)
    const buyPrice = Number(buy_unit_price)
    const feesAmount = Number(fees) || 0

    // Coût total dans la devise quote
    const costBasis = (quantity * buyPrice) + feesAmount

    // Valeur actuelle dans la devise quote
    const currentValue = quantity * currentPrice

    // Profit/Loss
    const plValue = currentValue - costBasis
    const plPct = costBasis > 0 ? (plValue / costBasis) * 100 : 0

    // Créer le symbole de trading (ISIN ou ticker)
    const tradingSymbol = isin || ticker || 'UNKNOWN'

    // Créer l'investissement
    const asset = await prisma.investmentAsset.create({
      data: {
        userId,
        name,
        symbol: tradingSymbol,
        category: 'ETF',
        platform,
        currency: finalCurrency,
        comment: notes || null,
        valuationMode: 'marché',
        priceProvider: 'placeholder', // TODO: mettre à jour avec le vrai provider
        baseSymbol: ticker || isin?.substring(0, 6) || null,
        quoteSymbol: finalCurrency,
        tradingViewSymbol: tradingSymbol,
        quantity,
        currentPrice,
        currentValue,
        amountInvested: costBasis,
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
        paidAmount: costBasis,
        paidCurrency: finalCurrency,
        purchaseDate,
        fxRateToQuote: null
      }
    })

    // Créer un snapshot de prix
    await prisma.priceSnapshot.create({
      data: {
        assetId: asset.id,
        quoteCurrency: finalCurrency,
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
        costBasis,
        plValue,
        plPct,
        quantity,
        buyPrice,
        currency: finalCurrency
      },
      metadata: {
        isin: isin || null,
        ticker: ticker || null,
        distributionType: distribution_type || null,
        envelope: envelope || null,
        benchmark: benchmark || null
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('ETF investment POST error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: error?.message || 'Impossible de créer l\'investissement ETF' },
      { status }
    )
  }
}








