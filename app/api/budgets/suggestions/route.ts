import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'

export async function GET(req: Request) {
    try {
        const userId = await getCurrentUserId()

        // Calculate date 3 months ago
        const threeMonthsAgo = new Date()
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
        threeMonthsAgo.setDate(1) // First day of that month
        threeMonthsAgo.setHours(0, 0, 0, 0)

        // Fetch expenses
        const transactions = await prisma.transaction.findMany({
            where: {
                account: { ownerId: userId },
                type: 'expense',
                date: { gte: threeMonthsAgo },
            },
            select: {
                amount: true,
                category: {
                    select: {
                        id: true,
                        parentId: true,
                    }
                }
            }
        })

        // Aggregate by parent category
        const totals: Record<string, number> = {}

        for (const tx of transactions) {
            if (!tx.category) continue

            const categoryId = tx.category.parentId || tx.category.id
            const amount = Number(tx.amount)

            // Expenses are negative in DB, we want positive budget suggestions
            const absAmount = Math.abs(amount)

            totals[categoryId] = (totals[categoryId] || 0) + absAmount
        }

        // Calculate average (simplify to division by 3, or actual months count if data is sparse? Strict /3 is good enough for suggestion)
        const suggestions: Record<string, number> = {}
        for (const [catId, total] of Object.entries(totals)) {
            suggestions[catId] = Math.round(total / 3)
        }

        return NextResponse.json(suggestions)
    } catch (error) {
        console.error('Budget suggestions error', error)
        return NextResponse.json({ error: 'Erreur lors du calcul des suggestions' }, { status: 500 })
    }
}
