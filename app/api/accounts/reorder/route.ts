import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'

export async function POST(req: Request) {
    try {
        const userId = await getCurrentUserId()
        const body = await req.json()
        const { items } = body

        if (!Array.isArray(items)) {
            return NextResponse.json({ error: 'Invalid data format' }, { status: 400 })
        }

        // Verify all items belong to user?
        // For performance, we assume IDs provided are valid or we catch error.
        // Better: Transaction.

        await prisma.$transaction(
            items.map((item: { id: string; displayOrder: number }) =>
                prisma.account.update({
                    where: { id: item.id, ownerId: userId }, // Ensure ownership
                    data: { displayOrder: item.displayOrder },
                })
            )
        )

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error reordering accounts:', error)
        return NextResponse.json({ error: 'Failed to reorder accounts' }, { status: 500 })
    }
}
