import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'

export async function GET(req: Request) {
  try {
    // VÃ©rifier l'authentification
    await getCurrentUserId()
    
    const { searchParams } = new URL(req.url)
    const categoryId = searchParams.get('categoryId')

    if (categoryId) {
      // RÃ©cupÃ©rer les sous-catÃ©gories d'une catÃ©gorie spÃ©cifique
      const subCategories = await prisma.subCategory.findMany({
        where: { categoryId },
        orderBy: { name: 'asc' },
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

      return NextResponse.json(
        subCategories.map((sub) => ({
          id: sub.id,
          name: sub.name,
          categoryId: sub.categoryId,
          category: sub.category,
        }))
      )
    }

    // RÃ©cupÃ©rer toutes les sous-catÃ©gories
    const subCategories = await prisma.subCategory.findMany({
      orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
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

    return NextResponse.json(
      subCategories.map((sub) => ({
        id: sub.id,
        name: sub.name,
        categoryId: sub.categoryId,
        category: sub.category,
      }))
    )
  } catch (error: any) {
    console.error('SubCategories API error:', error)
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisÃ©' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Erreur lors du chargement des sous-catÃ©gories' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    await getCurrentUserId()
    
    const body = await req.json()
    const { name, categoryId } = body

    if (!name || !categoryId) {
      return NextResponse.json(
        { error: 'Le nom et la catÃ©gorie sont requis' },
        { status: 400 }
      )
    }

    // VÃ©rifier que la catÃ©gorie existe
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    })

    if (!category) {
      return NextResponse.json(
        { error: 'CatÃ©gorie non trouvÃ©e' },
        { status: 404 }
      )
    }

    const subCategory = await prisma.subCategory.create({
      data: {
        name,
        categoryId,
      },
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

    return NextResponse.json({
      id: subCategory.id,
      name: subCategory.name,
      categoryId: subCategory.categoryId,
      category: subCategory.category,
    })
  } catch (error: any) {
    console.error('SubCategories POST error:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Cette sous-catÃ©gorie existe dÃ©jÃ  pour cette catÃ©gorie' },
        { status: 409 }
      )
    }
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisÃ©' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Erreur lors de la crÃ©ation de la sous-catÃ©gorie' },
      { status: 500 }
    )
  }
}






