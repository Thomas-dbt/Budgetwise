import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId()

    const body = await req.json()
    const { name, emoji } = body

    const categoryId = params.id

    // Vérifier que la catégorie existe et appartient à l'utilisateur
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId
      },
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Catégorie non trouvée' },
        { status: 404 }
      )
    }

    if (category.isSystem) {
      return NextResponse.json(
        { error: 'Impossible de modifier une catégorie système' },
        { status: 403 }
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

      // Vérifier si une autre catégorie avec ce nom existe déjà pour cet utilisateur
      const existing = await prisma.category.findFirst({
        where: {
          userId,
          name: trimmedName
        },
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
      isSystem: updatedCategory.isSystem
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
    const userId = await getCurrentUserId()

    const { searchParams } = new URL(req.url)
    const reassignToCategoryId = searchParams.get('reassignToCategoryId')

    const categoryId = params.id

    // Vérifier que la catégorie existe et appartient à l'utilisateur
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId
      },
      include: {
        subCategories: true,
      },
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Catégorie non trouvée' },
        { status: 404 }
      )
    }

    if (category.isSystem) {
      return NextResponse.json(
        { error: 'Impossible de supprimer une catégorie système' },
        { status: 403 }
      )
    }

    let transactionsUpdated = 0
    let eventsUpdated = 0

    // Si une catégorie de réassignation est fournie
    if (reassignToCategoryId) {
      // Vérifier que la catégorie de réassignation existe et appartient à l'utilisateur
      const reassignCategory = await prisma.category.findFirst({
        where: {
          id: reassignToCategoryId,
          userId
        },
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

