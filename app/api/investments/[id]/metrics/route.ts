import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'
import { computeInvestmentMetrics } from '@/lib/investment-metrics'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId()
    const { searchParams } = new URL(req.url)
    const quote = searchParams.get('quote') || 'USD'
    const investmentId = params.id

    // Vérifier que l'investissement appartient à l'utilisateur
    const asset = await prisma.investmentAsset.findUnique({
      where: { id: investmentId },
      include: {
        positions: true
      }
    })

    if (!asset || asset.userId !== userId) {
      return NextResponse.json(
        { error: 'Investissement introuvable' },
        { status: 404 }
      )
    }

    // Vérifier que l'investissement a un symbole de base et de quote
    const baseSymbol = asset.baseSymbol || asset.symbol?.split(/[\/\-]/)[0] || null
    const quoteSymbol = asset.quoteSymbol || quote

    if (!baseSymbol) {
      return NextResponse.json(
        { error: 'Symbole de base manquant pour cet investissement' },
        { status: 400 }
      )
    }

    // Préparer les données des positions
    const positions = asset.positions.map(pos => ({
      id: pos.id,
      quantity: Number(pos.quantity),
      paidAmount: Number((pos as any).paidAmount || pos.costBasis * Number(pos.quantity)),
      paidCurrency: (pos as any).paidCurrency || asset.currency || 'EUR',
      purchaseDate: pos.createdAt,
      fxRateToQuote: (pos as any).fxRateToQuote ? Number((pos as any).fxRateToQuote) : null
    }))

    // Calculer les métriques
    const metrics = await computeInvestmentMetrics(
      positions,
      baseSymbol,
      quoteSymbol
    )

    if (!metrics) {
      return NextResponse.json(
        { error: 'Impossible de calculer les métriques' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      investmentId: asset.id,
      investmentName: asset.name,
      baseSymbol,
      quoteSymbol,
      ...metrics,
      positions: positions.map(pos => ({
        id: pos.id,
        quantity: pos.quantity,
        paidAmount: pos.paidAmount,
        paidCurrency: pos.paidCurrency,
        purchaseDate: pos.purchaseDate.toISOString(),
        fxRateToQuote: pos.fxRateToQuote
      }))
    })
  } catch (error: any) {
    console.error('Metrics API error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: 'Erreur lors du calcul des métriques' },
      { status }
    )
  }
}



import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'
import { computeInvestmentMetrics } from '@/lib/investment-metrics'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId()
    const { searchParams } = new URL(req.url)
    const quote = searchParams.get('quote') || 'USD'
    const investmentId = params.id

    // Vérifier que l'investissement appartient à l'utilisateur
    const asset = await prisma.investmentAsset.findUnique({
      where: { id: investmentId },
      include: {
        positions: true
      }
    })

    if (!asset || asset.userId !== userId) {
      return NextResponse.json(
        { error: 'Investissement introuvable' },
        { status: 404 }
      )
    }

    // Vérifier que l'investissement a un symbole de base et de quote
    const baseSymbol = asset.baseSymbol || asset.symbol?.split(/[\/\-]/)[0] || null
    const quoteSymbol = asset.quoteSymbol || quote

    if (!baseSymbol) {
      return NextResponse.json(
        { error: 'Symbole de base manquant pour cet investissement' },
        { status: 400 }
      )
    }

    // Préparer les données des positions
    const positions = asset.positions.map(pos => ({
      id: pos.id,
      quantity: Number(pos.quantity),
      paidAmount: Number((pos as any).paidAmount || pos.costBasis * Number(pos.quantity)),
      paidCurrency: (pos as any).paidCurrency || asset.currency || 'EUR',
      purchaseDate: pos.createdAt,
      fxRateToQuote: (pos as any).fxRateToQuote ? Number((pos as any).fxRateToQuote) : null
    }))

    // Calculer les métriques
    const metrics = await computeInvestmentMetrics(
      positions,
      baseSymbol,
      quoteSymbol
    )

    if (!metrics) {
      return NextResponse.json(
        { error: 'Impossible de calculer les métriques' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      investmentId: asset.id,
      investmentName: asset.name,
      baseSymbol,
      quoteSymbol,
      ...metrics,
      positions: positions.map(pos => ({
        id: pos.id,
        quantity: pos.quantity,
        paidAmount: pos.paidAmount,
        paidCurrency: pos.paidCurrency,
        purchaseDate: pos.purchaseDate.toISOString(),
        fxRateToQuote: pos.fxRateToQuote
      }))
    })
  } catch (error: any) {
    console.error('Metrics API error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: 'Erreur lors du calcul des métriques' },
      { status }
    )
  }
}









