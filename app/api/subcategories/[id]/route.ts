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
    const { categoryId: newCategoryId, name: newName } = body

    const subCategoryId = params.id

    // Vérifier que la sous-catégorie existe
    const subCategory = await prisma.subCategory.findUnique({
      where: { id: subCategoryId },
      include: {
        category: true,
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

    const updateData: { categoryId?: string; name?: string } = {}
    let targetCategoryId = subCategory.categoryId

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
      const newCategory = await prisma.category.findUnique({
        where: { id: newCategoryId },
      })

      if (!newCategory) {
        return NextResponse.json(
          { error: 'Nouvelle catégorie non trouvée' },
          { status: 404 }
        )
      }

      targetCategoryId = newCategoryId
      updateData.categoryId = newCategoryId
    }

    // Vérifier l'unicité du nom dans la catégorie cible
    const nameToCheck = updateData.name || subCategory.name
    const existingSubCategory = await prisma.subCategory.findUnique({
      where: {
        categoryId_name: {
          categoryId: targetCategoryId,
          name: nameToCheck,
        },
      },
    })

    if (existingSubCategory && existingSubCategory.id !== subCategoryId) {
      return NextResponse.json(
        { error: `Une sous-catégorie "${nameToCheck}" existe déjà dans cette catégorie` },
        { status: 409 }
      )
    }

    // Mettre à jour la sous-catégorie
    const updatedSubCategory = await prisma.subCategory.update({
      where: { id: subCategoryId },
      data: updateData,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            emoji: true,
          },
        },
      },
    })

    let transactionsUpdated = 0
    let eventsUpdated = 0

    // Si la catégorie a changé, mettre à jour les transactions et événements
    if (newCategoryId && newCategoryId !== subCategory.categoryId) {
      const transactionsResult = await prisma.transaction.updateMany({
        where: { subCategoryId },
        data: { categoryId: newCategoryId },
      })
      transactionsUpdated = transactionsResult.count

      const eventsResult = await prisma.calendarEvent.updateMany({
        where: { subCategoryId },
        data: { categoryId: newCategoryId },
      })
      eventsUpdated = eventsResult.count
    }

    return NextResponse.json({
      id: updatedSubCategory.id,
      name: updatedSubCategory.name,
      categoryId: updatedSubCategory.categoryId,
      category: updatedSubCategory.category,
      transactionsUpdated,
      eventsUpdated,
    })
  } catch (error: any) {
    console.error('SubCategory PATCH error:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Une sous-catégorie avec ce nom existe déjà dans cette catégorie' },
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
    await getCurrentUserId()

    const subCategoryId = params.id

    // Vérifier que la sous-catégorie existe
    const subCategory = await prisma.subCategory.findUnique({
      where: { id: subCategoryId },
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

    // Supprimer la sous-catégorie
    // Les transactions et événements auront subCategoryId mis à null automatiquement (SetNull via Prisma)
    await prisma.subCategory.delete({
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

