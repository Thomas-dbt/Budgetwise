import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendExpenseReminderEmail } from '@/lib/mailer'
import { generateRecurringOccurrences } from '@/lib/calendar-utils'

// This route should be called periodically (e.g. daily) via a cron job or external trigger
export async function GET(req: Request) {
    try {
        // Security: Check for a secret key if deployed, or allow localhost
        // For now, we assume this is called safely. In production, check Authorization header.
        const { searchParams } = new URL(req.url)
        const key = searchParams.get('key')
        const secret = process.env.CRON_SECRET

        // Optional basic security
        if (secret && key !== secret) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        console.log('Starting expense reminder check...')

        // 1. Fetch all events with notifications enabled
        const events = await prisma.calendarEvent.findMany({
            where: {
                notifyByEmail: true,
            },
            include: {
                user: true, // Need user email
                // We need exceptions to correctly calculate recurring instances
            }
        })

        // Fetch exceptions manually/separately if needed, or include relation if defined in schema?
        // Schema has 'exceptions CalendarEventException[]'.
        // Let's optimize by fetching events WITH exceptions directly.
        // The previous manual query in calendar/route.ts was due to some caching/stale client issue?
        // Let's try standard include first.

        // Re-fetch with exceptions included properly
        const eventsWithRelations = await prisma.calendarEvent.findMany({
            where: { notifyByEmail: true },
            include: {
                user: true,
                exceptions: true
            }
        })

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        let sentCount = 0
        let errors = 0

        const results = []

        for (const event of eventsWithRelations) {
            if (!event.user.email) continue

            const reminderDays = event.emailReminderDaysBefore ?? 0 // Default to 0 if null

            // We are looking for an occurrence that happens exactly 'reminderDays' from now.
            // Target Date = Today + reminderDays
            const targetDate = new Date(today)
            targetDate.setDate(targetDate.getDate() + reminderDays)
            targetDate.setHours(0, 0, 0, 0)

            // Check if event is active (start date <= target date)
            // For one-time events:
            if (!event.recurring) {
                const eventDate = new Date(event.dueDate)
                eventDate.setHours(0, 0, 0, 0)

                if (eventDate.getTime() === targetDate.getTime()) {
                    // Send email
                    const status = await sendExpenseReminderEmail({
                        to: event.user.email,
                        title: event.title,
                        amount: Number(event.amount),
                        dueDate: eventDate.toISOString(),
                        daysLeft: reminderDays
                    })
                    if (status === 'sent') sentCount++
                    results.push({ title: event.title, email: event.user.email, status, date: eventDate.toISOString() })
                }
            } else {
                // For recurring events
                // Generate occurrences around the target date.
                // We only strictly care if ONE occurrence falls ON the target date.
                // We can generate for a small window: targetDate to targetDate (inclusive)

                // generateRecurringOccurrences logic expects (baseEvent, startDate, endDate, exceptions)
                // We pass targetDate as both start and end to see if anything lands there.
                // Need to set hours for the window to cover the full day?
                const windowStart = new Date(targetDate)
                windowStart.setHours(0, 0, 0, 0)
                const windowEnd = new Date(targetDate)
                windowEnd.setHours(23, 59, 59, 999)

                const occurrences = generateRecurringOccurrences(
                    event,
                    windowStart,
                    windowEnd,
                    event.exceptions
                )

                // If we found an occurrence in this window (and it's not confirmed? Schema says 'confirmed' is boolean on event, 
                // but for recurring it's complex. Usually reminders are sent regardless of confirmation status, 
                // OR we check if a transaction exists? 
                // User asked for "reminder before it happens". Usually means "don't forget". 
                // So we send it.

                if (occurrences.length > 0) {
                    const occurrence = occurrences[0]
                    const status = await sendExpenseReminderEmail({
                        to: event.user.email,
                        title: event.title, // Title matches recurring event
                        amount: Number(event.amount),
                        dueDate: occurrence.dueDate.toISOString(),
                        daysLeft: reminderDays
                    })
                    if (status === 'sent') sentCount++
                    results.push({ title: event.title, email: event.user.email, status, date: occurrence.dueDate.toISOString() })
                }
            }
        }

        console.log(`Reminder check complete. Sent: ${sentCount}, Scanned: ${eventsWithRelations.length}`)

        return NextResponse.json({
            success: true,
            sent: sentCount,
            scanned: eventsWithRelations.length,
            results
        })

    } catch (error: any) {
        console.error('Cron reminder error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// Add POST handler just in case (often cron services use POST)
export async function POST(req: Request) {
    return GET(req)
}
