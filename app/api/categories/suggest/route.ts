import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/server-auth'
import { autoCategorize } from '@/lib/auto-categorize'

export async function POST(req: Request) {
    try {
        const userId = await getCurrentUserId()
        const body = await req.json()

        if (Array.isArray(body.descriptions)) {
            const { autoCategorizeBatch } = await import('@/lib/auto-categorize')
            const matches = await autoCategorizeBatch(body.descriptions, userId)
            return NextResponse.json({ matches })
        }

        const { description } = body
        if (!description || typeof description !== 'string') {
            return NextResponse.json({ error: 'Description required' }, { status: 400 })
        }

        const match = await autoCategorize(description, userId)
        return NextResponse.json({ match })
    } catch (error) {
        console.error('Category suggestion error:', error)
        return NextResponse.json({ error: 'Failed to suggest category' }, { status: 500 })
    }
}
