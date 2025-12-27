import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json()
    const { 
      assetId, 
      quantity, 
      costBasis,
      paidAmount,
      paidCurrency,
      purchaseDate,
      fxRateToQuote
    } = body

    if (!assetId || !quantity) {
      return NextResponse.json({ error: 'Champs obligatoires manquants (assetId, quantity)' }, { status: 400 })
    }

    // Vérifier que l'actif appartient à l'utilisateur
    const asset = await prisma.investmentAsset.findUnique({
      where: { id: assetId }
    })

    if (!asset || asset.userId !== userId) {
      return NextResponse.json({ error: 'Actif introuvable' }, { status: 404 })
    }

    // Calculer costBasis si non fourni
    let calculatedCostBasis = costBasis
    if (!calculatedCostBasis && paidAmount && quantity) {
      calculatedCostBasis = Number(paidAmount) / Number(quantity)
    } else if (!calculatedCostBasis) {
      calculatedCostBasis = 0
    }

    const positionData: any = {
      assetId,
      quantity: Number(quantity),
      costBasis: Number(calculatedCostBasis)
    }

    // Ajouter les champs optionnels s'ils sont fournis
    if (paidAmount !== undefined) {
      positionData.paidAmount = Number(paidAmount)
    }
    if (paidCurrency) {
      positionData.paidCurrency = paidCurrency
    }
    if (purchaseDate) {
      positionData.purchaseDate = new Date(purchaseDate)
    }
    if (fxRateToQuote !== undefined && fxRateToQuote !== null) {
      positionData.fxRateToQuote = Number(fxRateToQuote)
    }

    const position = await prisma.position.create({
      data: positionData
    })

    return NextResponse.json(position, { status: 201 })
  } catch (error: any) {
    console.error('Positions POST error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: 'Impossible de créer la position' },
      { status }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
    }

    // Vérifier que la position appartient à un actif de l'utilisateur
    const position = await prisma.position.findUnique({
      where: { id },
      include: { asset: true }
    })

    if (!position || position.asset.userId !== userId) {
      return NextResponse.json({ error: 'Position introuvable' }, { status: 404 })
    }

    await prisma.position.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Positions DELETE error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: 'Impossible de supprimer la position' },
      { status }
    )
  }
}





      return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
    }

    // Vérifier que la position appartient à un actif de l'utilisateur
    const position = await prisma.position.findUnique({
      where: { id },
      include: { asset: true }
    })

    if (!position || position.asset.userId !== userId) {
      return NextResponse.json({ error: 'Position introuvable' }, { status: 404 })
    }

    await prisma.position.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Positions DELETE error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: 'Impossible de supprimer la position' },
      { status }
    )
  }
}




