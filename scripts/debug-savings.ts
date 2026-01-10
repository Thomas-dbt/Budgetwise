import { prisma } from '../lib/prisma'

async function main() {
    const userId = await prisma.user.findFirst().then(u => u?.id)
    if (!userId) {
        console.log('No user found')
        return
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    console.log(`Analyzing transactions from ${startOfMonth.toISOString()} to ${endOfMonth.toISOString()}`)

    const transactions = await prisma.transaction.findMany({
        where: {
            account: { ownerId: userId },
            date: { gte: startOfMonth, lte: endOfMonth },
        },
        include: { category: true }
    })

    console.log(`Found ${transactions.length} transactions.`)

    const byCategory: Record<string, number> = {}

    transactions.forEach(t => {
        const catName = t.category?.name || 'Uncategorized'
        const amount = Number(t.amount)
        // For savings rate logic: Income - Expense
        // Typically savings are transfers to savings accounts or expenses categorized as savings

        // Let's just sum up the raw amounts per category to see what's happening
        byCategory[catName] = (byCategory[catName] || 0) + amount
    })

    console.log('--- Totals by Category ---')
    Object.entries(byCategory).forEach(([name, total]) => {
        console.log(`${name}: ${total.toFixed(2)} €`)
    })

    console.log('--- Current Logic Check ---')
    const investmentKeywords = ['épargne', 'epargne', 'investissement', 'invest', 'savings']
    const excludedKeywords = ['immobilier', 'apport', 'notaire', 'capital', 'transfert']

    transactions.forEach(t => {
        if (!t.category) return
        const catName = t.category.name.toLowerCase()
        const isIncluded = investmentKeywords.some(kw => catName.includes(kw))
        const isExcluded = excludedKeywords.some(kw => catName.includes(kw))

        if (isIncluded && !isExcluded) {
            console.log(`[MATCH] ${t.date.toISOString().split('T')[0]} - ${catName}: ${t.amount} (${t.type})`)
        }
    })
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
