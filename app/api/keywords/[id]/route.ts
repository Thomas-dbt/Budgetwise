import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const userId = await getCurrentUserId()
        const { id } = params

        const keyword = await (prisma as any).categoryKeyword.findUnique({
            where: { id },
            include: { category: true }
        }) as any

        if (!keyword || keyword.category.userId !== userId) {
            return NextResponse.json({ error: 'Keyword not found or unauthorized' }, { status: 404 })
        }

        await (prisma as any).categoryKeyword.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Delete keyword error:', error)
        return NextResponse.json({ error: 'Failed to delete keyword' }, { status: 500 })
    }
}
