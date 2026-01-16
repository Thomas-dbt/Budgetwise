import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'
import crypto from 'crypto' // Node.js built-in

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const userId = await getCurrentUserId()
        const { id } = params
        const { searchParams } = new URL(req.url)
        const scope = searchParams.get('scope') // 'occurrence' | 'series'
        const dateStr = searchParams.get('date')

        if (!id) {
            return NextResponse.json({ error: 'Missing event id' }, { status: 400 })
        }

        const existing = await prisma.calendarEvent.findUnique({
            where: { id },
        })

        if (!existing || existing.userId !== userId) {
            return NextResponse.json({ error: 'Événement introuvable' }, { status: 404 })
        }

        if (scope === 'occurrence' && dateStr) {
            // Create an exception for this specific date
            const exceptionDate = new Date(dateStr)
            if (isNaN(exceptionDate.getTime())) {
                return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
            }

            try {
                // Use raw SQL to insert exception because Prisma Client might be stale
                // and not know about CalendarEventException model yet.
                const uuid = crypto.randomUUID()
                const now = new Date()

                // Note: SQLite table names are usually model names. Double check casing if fails.
                await prisma.$executeRaw`
                    INSERT INTO CalendarEventException (id, eventId, date, createdAt)
                    VALUES (${uuid}, ${id}, ${exceptionDate}, ${now})
                `
            } catch (e) {
                console.error('Failed to insert exception:', e)
                return NextResponse.json({ error: 'Database error: Could not save exception' }, { status: 500 })
            }

            return NextResponse.json(null, { status: 204 })
        }

        // Default: delete the entire event (series)
        await prisma.calendarEvent.delete({
            where: { id },
        })

        return new NextResponse(null, { status: 204 })
    } catch (error: any) {
        console.error('Calendar DELETE error:', error)
        const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
        return NextResponse.json({ error: 'Failed to delete event' }, { status })
    }
}
