import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'

export async function GET(req: Request) {
    try {
        const userId = await getCurrentUserId()
        const keywords = await prisma.categoryKeyword.findMany({
            where: { userId } as any,
            include: { category: true },
            orderBy: { createdAt: 'desc' }
        })
        return NextResponse.json(keywords)
    } catch (error) {
        console.error('Fetch keywords error:', error)
        return NextResponse.json({ error: 'Failed to fetch keywords' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const userId = await getCurrentUserId()
        const { categoryId, keyword, matchType } = await req.json()

        if (!categoryId || !keyword) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
        }

        // Verify category ownership
        const category = await prisma.category.findUnique({
            where: { id: categoryId }
        })

        if (!category || category.userId !== userId) {
            return NextResponse.json({ error: 'Category not found or unauthorized' }, { status: 404 })
        }

        // Create keyword
        const newKeyword = await prisma.categoryKeyword.create({
            data: {
                keyword: keyword.trim(),
                matchType: matchType || 'contains',
                categoryId,
                userId
            } as any,
            include: {
                category: true
            }
        })

        return NextResponse.json(newKeyword)
    } catch (error: any) {
        if (error.code === 'P2002') { // Unique constraint violation
            return NextResponse.json({ error: 'Ce mot-clé existe déjà pour cette catégorie ou ce compte' }, { status: 409 })
        }
        console.error('Create keyword error:', error)
        return NextResponse.json({ error: 'Failed to create keyword' }, { status: 500 })
    }
}
