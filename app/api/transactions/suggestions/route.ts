import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    try {
        const userId = await getCurrentUserId()
        if (!userId) return new NextResponse('Unauthorized', { status: 401 })

        // 1. Fetch transactions from the last 6 months
        const date = new Date()
        date.setMonth(date.getMonth() - 6)
        date.setDate(1)
        const sixMonthsAgo = date

        const transactions = await prisma.transaction.findMany({
            where: {
                account: { ownerId: userId },
                date: { gte: sixMonthsAgo },
                type: { in: ['expense', 'income'] }, // Only recurrent expenses or income
                // Removed isRecurring filter as field does not exist
            },
            select: {
                id: true,
                date: true,
                amount: true,
                description: true,
                categoryId: true,
                type: true,
            },
            orderBy: { date: 'desc' }
        })

        // 2. Group by normalized description
        const groups: Record<string, typeof transactions> = {}

        for (const tx of transactions) {
            if (!tx.description) continue
            // Normalize: lowercase, remove numbers/dates (simple regex), trim
            // Simple normalization: keep strict for now to avoid false positives
            const key = tx.description.toLowerCase().trim()

            if (!groups[key]) {
                groups[key] = []
            }
            groups[key].push(tx)
        }

        // 3. Analyze groups for recurrence
        const suggestions = []

        // Get existing calendar events to avoid duplicates
        const existingEvents = await prisma.calendarEvent.findMany({
            where: { userId },
            select: { title: true, amount: true }
        })

        const existingSignatures = new Set(
            existingEvents.map(e => `${e.title.toLowerCase().trim()}-${Number(e.amount).toFixed(2)}`)
        )

        for (const [desc, txs] of Object.entries(groups)) {
            if (txs.length < 3) continue // Need at least 3 occurrences

            // Sort by date asc
            const sortedTxs = txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

            // Check amounts consistency (allow small deviation?)
            // For now, simple check: are most amounts the same?
            const amounts = sortedTxs.map(t => Number(t.amount))
            const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length

            // Filter out if variance is too high (optional, for now trust description)

            // Calculate intervals
            let totalDays = 0
            let intervalsCount = 0

            for (let i = 1; i < sortedTxs.length; i++) {
                const diffTime = Math.abs(new Date(sortedTxs[i].date).getTime() - new Date(sortedTxs[i - 1].date).getTime());
                const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                totalDays += days
                intervalsCount++
            }

            const avgInterval = totalDays / intervalsCount

            // Check if monthly (approx 28-32 days)
            const isMonthly = avgInterval >= 25 && avgInterval <= 35

            // Check if signature exists
            const signature = `${desc}-${avgAmount.toFixed(2)}`
            if (existingSignatures.has(signature)) continue

            if (isMonthly) {
                // High confidence suggestion
                suggestions.push({
                    type: 'monthly',
                    description: sortedTxs[0].description, // Use original casing of most recent?
                    amount: avgAmount,
                    lastDate: sortedTxs[sortedTxs.length - 1].date,
                    categoryId: sortedTxs[0].categoryId,
                    occurrences: txs.length,
                    confidence: 'high'
                })
            }
        }

        return NextResponse.json({ suggestions })

    } catch (error) {
        console.error('Error detecting recurring transactions:', error)
        return NextResponse.json({ error: 'Failed to analyze transactions' }, { status: 500 })
    }
}
