import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'

export async function GET(req: Request) {
  try {
    // Vérifier l'authentification
    const userId = await getCurrentUserId()

    const { searchParams } = new URL(req.url)
    const categoryId = searchParams.get('categoryId')

    if (categoryId) {
      // Récupérer les sous-catégories (enfants) d'une catégorie spécifique
      const subCategories = await prisma.category.findMany({
        where: {
          userId,
          parentId: categoryId
        },
        orderBy: { name: 'asc' },
        include: {
          parent: { // Include parent as "category"
            select: {
              id: true,
              name: true,
              emoji: true,
            },
          },
        },
      })

      return NextResponse.json(
        subCategories.map((sub) => ({
          id: sub.id,
          name: sub.name,
          categoryId: sub.parentId,
          category: sub.parent,
        }))
      )
    }

    // Récupérer toutes les sous-catégories (toutes celles qui ont un parent)
    const subCategories = await prisma.category.findMany({
      where: {
        userId,
        NOT: { parentId: null }
      },
      orderBy: [{ parent: { name: 'asc' } }, { name: 'asc' }],
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

    return NextResponse.json(
      subCategories.map((sub) => ({
        id: sub.id,
        name: sub.name,
        categoryId: sub.parentId,
        category: sub.parent,
      }))
    )
  } catch (error: any) {
    console.error('SubCategories API error:', error)
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Erreur lors du chargement des sous-catégories' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId()

    const body = await req.json()
    const { name, categoryId } = body

    if (!name || !categoryId) {
      return NextResponse.json(
        { error: 'Le nom et la catégorie sont requis' },
        { status: 400 }
      )
    }

    // Vérifier que la catégorie parent existe
    const parentCategory = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId
      },
    })

    if (!parentCategory) {
      return NextResponse.json(
        { error: 'Catégorie parente non trouvée' },
        { status: 404 }
      )
    }

    // Créer la sous-catégorie (Category avec parentId)
    const subCategory = await prisma.category.create({
      data: {
        name,
        parentId: categoryId,
        userId,
        isSystem: false,
      },
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

    return NextResponse.json({
      id: subCategory.id,
      name: subCategory.name,
      categoryId: subCategory.parentId,
      category: subCategory.parent,
    })
  } catch (error: any) {
    console.error('SubCategories POST error:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Cette sous-catégorie existe déjà pour cette catégorie' },
        { status: 409 }
      )
    }
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Erreur lors de la création de la sous-catégorie' },
      { status: 500 }
    )
  }
}






