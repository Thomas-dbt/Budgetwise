import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'

const DEFAULT_CATEGORIES = [
  { name: 'Abonnements', emoji: '🔁' },
  { name: 'Alimentation', emoji: '🍽️' },
  { name: 'Assurances', emoji: '🛡️' },
  { name: 'Autres', emoji: '📦' },
  { name: 'Énergie', emoji: '⚡' },
  { name: 'Épargne & investissement', emoji: '💼' },
  { name: 'Logement', emoji: '🏠' },
  { name: 'Loisirs', emoji: '🎮' },
  { name: 'Santé', emoji: '🩺' },
  { name: 'Shopping', emoji: '🛍️' },
  { name: 'Transport', emoji: '🚌' },
  { name: 'Voyages', emoji: '✈️' },
]

export async function GET() {
  try {
    // Vérifier l'authentification (mais les catégories sont globales, donc on continue même si ça échoue)
    let userId: string | null = null
    try {
      userId = await getCurrentUserId()
    } catch (error) {
      // Si l'authentification échoue, on continue quand même car les catégories sont globales
      console.warn('Categories API: Authentication failed, but categories are global')
    }

    // Créer les catégories par défaut si elles n'existent pas
    for (const category of DEFAULT_CATEGORIES) {
      try {
        await prisma.category.upsert({
          where: { name: category.name },
          update: {},
          create: category,
        })
      } catch (error) {
        console.error(`Error upserting category ${category.name}:`, error)
        // Continue avec les autres catégories
      }
    }

    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(
      categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        emoji: cat.emoji,
      }))
    )
  } catch (error: any) {
    console.error('Categories API error:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des catégories' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    await getCurrentUserId()
    
    const body = await req.json()
    const { name, emoji } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le nom de la catégorie est requis' },
        { status: 400 }
      )
    }

    const trimmedName = name.trim()

    // Vérifier si la catégorie existe déjà
    const existing = await prisma.category.findUnique({
      where: { name: trimmedName },
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
        name: trimmedName,
        emoji: emoji || null,
      },
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

