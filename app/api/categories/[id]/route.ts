import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await getCurrentUserId()

    const body = await req.json()
    const { name, emoji } = body

    const categoryId = params.id

    // Vérifier que la catégorie existe
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Catégorie non trouvée' },
        { status: 404 }
      )
    }

    const updateData: { name?: string; emoji?: string | null } = {}

    // Mettre à jour le nom si fourni
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Le nom de la catégorie ne peut pas être vide' },
          { status: 400 }
        )
      }

      const trimmedName = name.trim()

      // Vérifier si un autre catégorie avec ce nom existe déjà
      const existing = await prisma.category.findUnique({
        where: { name: trimmedName },
      })

      if (existing && existing.id !== categoryId) {
        return NextResponse.json(
          { error: 'Une catégorie avec ce nom existe déjà' },
          { status: 409 }
        )
      }

      updateData.name = trimmedName
    }

    // Mettre à jour l'emoji si fourni
    if (emoji !== undefined) {
      updateData.emoji = emoji || null
    }

    // Mettre à jour la catégorie
    const updatedCategory = await prisma.category.update({
      where: { id: categoryId },
      data: updateData,
    })

    return NextResponse.json({
      id: updatedCategory.id,
      name: updatedCategory.name,
      emoji: updatedCategory.emoji,
    })
  } catch (error: any) {
    console.error('Category PATCH error:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Une catégorie avec ce nom existe déjà' },
        { status: 409 }
      )
    }
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la catégorie' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await getCurrentUserId()

    const { searchParams } = new URL(req.url)
    const reassignToCategoryId = searchParams.get('reassignToCategoryId')

    const categoryId = params.id

    // Vérifier que la catégorie existe
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        transactions: true,
        calendarEvents: true,
        subCategories: true,
      },
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Catégorie non trouvée' },
        { status: 404 }
      )
    }

    let transactionsUpdated = 0
    let eventsUpdated = 0

    // Si une catégorie de réassignation est fournie
    if (reassignToCategoryId) {
      // Vérifier que la catégorie de réassignation existe
      const reassignCategory = await prisma.category.findUnique({
        where: { id: reassignToCategoryId },
      })

      if (!reassignCategory) {
        return NextResponse.json(
          { error: 'Catégorie de réassignation non trouvée' },
          { status: 404 }
        )
      }

      if (reassignToCategoryId === categoryId) {
        return NextResponse.json(
          { error: 'La catégorie de réassignation doit être différente' },
          { status: 400 }
        )
      }

      // Mettre à jour toutes les transactions qui utilisent cette catégorie
      const transactionsResult = await prisma.transaction.updateMany({
        where: { categoryId },
        data: { categoryId: reassignToCategoryId },
      })
      transactionsUpdated = transactionsResult.count

      // Mettre à jour tous les événements calendrier qui utilisent cette catégorie
      const eventsResult = await prisma.calendarEvent.updateMany({
        where: { categoryId },
        data: { categoryId: reassignToCategoryId },
      })
      eventsUpdated = eventsResult.count

      // Mettre à jour les sous-catégories : déplacer leurs transactions vers la nouvelle catégorie
      for (const subCategory of category.subCategories) {
        const subTransactionsResult = await prisma.transaction.updateMany({
          where: { subCategoryId: subCategory.id },
          data: { categoryId: reassignToCategoryId },
        })
        transactionsUpdated += subTransactionsResult.count

        const subEventsResult = await prisma.calendarEvent.updateMany({
          where: { subCategoryId: subCategory.id },
          data: { categoryId: reassignToCategoryId },
        })
        eventsUpdated += subEventsResult.count
      }
    }

    // Supprimer la catégorie (les sous-catégories seront supprimées en cascade via Prisma)
    await prisma.category.delete({
      where: { id: categoryId },
    })

    return NextResponse.json({
      deleted: true,
      transactionsUpdated,
      eventsUpdated,
    })
  } catch (error: any) {
    console.error('Category DELETE error:', error)
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la catégorie' },
      { status: 500 }
    )
  }
}

