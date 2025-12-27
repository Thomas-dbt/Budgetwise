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
    const { categoryId: newCategoryId, name: newName } = body

    const subCategoryId = params.id

    // Vérifier que la sous-catégorie existe
    const subCategory = await prisma.category.findFirst({
      where: { id: subCategoryId, userId },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            emoji: true,
          },
        },
        transactions: true,
        calendarEvents: true,
      },
    })

    if (!subCategory) {
      return NextResponse.json(
        { error: 'Sous-catégorie non trouvée' },
        { status: 404 }
      )
    }

    const updateData: { parentId?: string; name?: string } = {}
    let targetCategoryId = subCategory.parentId

    // Si un nouveau nom est fourni
    if (newName !== undefined) {
      if (typeof newName !== 'string' || newName.trim().length === 0) {
        return NextResponse.json(
          { error: 'Le nom de la sous-catégorie ne peut pas être vide' },
          { status: 400 }
        )
      }
      updateData.name = newName.trim()
    }

    // Si une nouvelle catégorie est fournie (déplacement)
    if (newCategoryId !== undefined && newCategoryId !== null) {
      if (typeof newCategoryId !== 'string') {
        return NextResponse.json(
          { error: 'La nouvelle catégorie est invalide' },
          { status: 400 }
        )
      }

      // Vérifier que la nouvelle catégorie existe
      const newCategory = await prisma.category.findFirst({
        where: { id: newCategoryId, userId },
      })

      if (!newCategory) {
        return NextResponse.json(
          { error: 'Nouvelle catégorie non trouvée' },
          { status: 404 }
        )
      }

      if (newCategoryId === subCategoryId) {
        return NextResponse.json(
          { error: 'Une catégorie ne peut pas être son propre parent' },
          { status: 400 }
        )
      }

      targetCategoryId = newCategoryId
      updateData.parentId = newCategoryId
    }

    // Vérifier l'unicité du nom
    if (updateData.name || updateData.parentId) {
      const nameToCheck = updateData.name || subCategory.name

      const existing = await prisma.category.findFirst({
        where: {
          userId,
          name: nameToCheck,
          NOT: {
            id: subCategoryId
          }
        },
      })

      if (existing) {
        return NextResponse.json(
          { error: `Une catégorie "${nameToCheck}" existe déjà` },
          { status: 409 }
        )
      }
    }

    // Mettre à jour la sous-catégorie
    const updatedSubCategory = await prisma.category.update({
      where: { id: subCategoryId },
      data: updateData,
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            emoji: true,
          },
        },
      },
    })

    // Transactions and events are linked to the ID, which doesn't change.
    // So no updates needed for them.

    return NextResponse.json({
      id: updatedSubCategory.id,
      name: updatedSubCategory.name,
      categoryId: updatedSubCategory.parentId,
      category: updatedSubCategory.parent,
      transactionsUpdated: 0,
      eventsUpdated: 0,
    })
  } catch (error: any) {
    console.error('SubCategory PATCH error:', error)
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
      { error: 'Erreur lors de la mise à jour de la sous-catégorie' },
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
    const subCategoryId = params.id

    // Vérifier que la sous-catégorie existe
    const subCategory = await prisma.category.findFirst({
      where: { id: subCategoryId, userId },
      include: {
        transactions: true,
        calendarEvents: true,
      },
    })

    if (!subCategory) {
      return NextResponse.json(
        { error: 'Sous-catégorie non trouvée' },
        { status: 404 }
      )
    }

    const transactionsCount = subCategory.transactions.length
    const eventsCount = subCategory.calendarEvents.length

    // Supprimer la sous-catégorie (Category)
    await prisma.category.delete({
      where: { id: subCategoryId },
    })

    return NextResponse.json({
      deleted: true,
      transactionsAffected: transactionsCount,
      eventsAffected: eventsCount,
    })
  } catch (error: any) {
    console.error('SubCategory DELETE error:', error)
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la sous-catégorie' },
      { status: 500 }
    )
  }
}

