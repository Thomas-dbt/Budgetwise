import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'

export async function GET() {
  try {
    const userId = await getCurrentUserId()

    const categories = await prisma.category.findMany({
      where: {
        userId,
        parentId: null // Only fetch top-level categories
      } as any,
      orderBy: { name: 'asc' },
      include: {
        children: {
          orderBy: { name: 'asc' }
        }
      } as any
    }) as any[]

    return NextResponse.json(
      categories.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        emoji: cat.emoji,
        isSystem: cat.isSystem,
        subCategories: cat.children ? cat.children.map((sub: any) => ({
          id: sub.id,
          name: sub.name,
          categoryId: sub.parentId // Map parentId to categoryId for frontend compatibility
        })) : []
      }))
    )
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    console.error('Categories API error:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des catégories' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId()

    const body = await req.json()
    const { name, emoji } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le nom de la catégorie est requis' },
        { status: 400 }
      )
    }

    const trimmedName = name.trim()

    // Vérifier si la catégorie existe déjà pour cet utilisateur
    const existing = await prisma.category.findFirst({
      where: {
        userId,
        name: trimmedName
      } as any,
    })

    if (existing) {
      return NextResponse.json({
        id: existing.id,
        name: existing.name,
        emoji: existing.emoji,
      })
    }

    const category = await prisma.category.create({
      data: {
        userId,
        name: trimmedName,
        emoji: emoji || null,
        isSystem: false
      } as any,
    })

    return NextResponse.json({
      id: category.id,
      name: category.name,
      emoji: category.emoji,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Categories POST error:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Cette catégorie existe déjà' },
        { status: 409 }
      )
    }
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Erreur lors de la création de la catégorie' },
      { status: 500 }
    )
  }
}

