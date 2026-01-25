import { prisma } from '@/lib/prisma'
import { generateRecurringOccurrences } from '@/lib/calendar-utils'

async function main() {
    console.log('--- Verifying Email Reminders ---')

    // 1. Get or create a test user
    const user = await prisma.user.findFirst()
    if (!user) {
        console.error('No user found to test with.')
        process.exit(1)
    }
    console.log(`Using user: ${user.email}`)

    // 2. Create a test event due in 2 days
    // "2 days" is the reminder setting we will use.
    const today = new Date()
    const daysBefore = 2

    const targetDate = new Date(today)
    targetDate.setDate(targetDate.getDate() + daysBefore)
    targetDate.setHours(12, 0, 0, 0) // Noon on target day

    console.log(`Creating test event due on: ${targetDate.toISOString()} (Today + ${daysBefore} days)`)

    const testEvent = await prisma.calendarEvent.create({
        data: {
            userId: user.id,
            title: 'TEST REMINDER EVENT',
            amount: 123.45,
            type: 'debit',
            dueDate: targetDate,
            notifyByEmail: true,
            emailReminderDaysBefore: daysBefore,
            confirmed: false
        }
    })

    try {
        // 3. Trigger the API logic
        // We can't easily curl localhost from here inside the script if we want to rely on the running server 
        // without fetching dependencies like 'node-fetch' (though native fetch exists in Node 18+).
        // Let's rely on Node's native fetch.

        console.log('Triggering Reminder API [GET] http://localhost:3001/api/cron/reminders')

        const response = await fetch('http://localhost:3001/api/cron/reminders')
        if (!response.ok) {
            throw new Error(`API returned ${response.status}: ${await response.text()}`)
        }

        const result = await response.json()
        console.log('API Result:', JSON.stringify(result, null, 2))

        // 4. Verify result
        const sentItem = result.results.find((r: any) => r.title === 'TEST REMINDER EVENT')
        if (sentItem) {
            console.log(`SUCCESS: Found processed item. Status: ${sentItem.status}`)
            if (sentItem.status === 'skipped') {
                console.log('Note: Status is "skipped". This typically means SMTP is not configured in .env.')
            } else if (sentItem.status === 'sent') {
                console.log('Great! Email was allegedly queued/sent.')
            }
        } else {
            console.error('FAILURE: Test event was NOT found in results.')
        }

    } catch (e: any) {
        console.error('Error during verification:', e)
    } finally {
        // 5. Cleanup
        console.log('Cleaning up test event...')
        await prisma.calendarEvent.delete({ where: { id: testEvent.id } })
    }
}

main().catch(console.error)
