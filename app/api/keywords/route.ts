import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'

export async function POST(req: Request) {
    try {
        const userId = await getCurrentUserId()
        const { categoryId, keyword } = await req.json()

        if (!categoryId || !keyword) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
        }

        // Verify category ownership
        const category = await prisma.category.findUnique({
            where: { id: categoryId }
        }) as any

        if (!category || (category as any).userId !== userId) {
            return NextResponse.json({ error: 'Category not found or unauthorized' }, { status: 404 })
        }

        // Create keyword
        const newKeyword = await (prisma as any).categoryKeyword.create({
            data: {
                keyword: keyword.trim(),
                categoryId
            }
        })

        return NextResponse.json(newKeyword)
    } catch (error: any) {
        if (error.code === 'P2002') { // Unique constraint violation
            return NextResponse.json({ error: 'Ce mot-clé existe déjà pour cette catégorie' }, { status: 409 })
        }
        console.error('Create keyword error:', error)
        return NextResponse.json({ error: 'Failed to create keyword' }, { status: 500 })
    }
}
