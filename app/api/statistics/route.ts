import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'

export async function GET(req: Request) {
  try {
    const userId = await getCurrentUserId()
    // Récupérer toutes les transactions
    const transactions = await prisma.transaction.findMany({
      where: { account: { ownerId: userId } },
      include: {
        category: true,
        account: true
      },
      orderBy: { date: 'desc' }
    })

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    // Statistiques du mois actuel
    const currentMonthTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.date)
      return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear
    })

    const monthlyIncome = currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const monthlyExpenses = currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)

    // Répartition par catégories (6 derniers mois)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const recentTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.date)
      return txDate >= sixMonthsAgo && tx.type === 'expense'
    })

    const categoryExpenses: Record<string, number> = {}
    recentTransactions.forEach(tx => {
      const categoryName = tx.category?.name || 'Autres'
      categoryExpenses[categoryName] = (categoryExpenses[categoryName] || 0) + Math.abs(Number(tx.amount))
    })

    const categoryData = Object.entries(categoryExpenses)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)

    // Évolution mensuelle (6 derniers mois)
    const monthlyEvolution = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
      
      const monthTxs = transactions.filter(tx => {
        const txDate = new Date(tx.date)
        return txDate >= monthStart && txDate <= monthEnd
      })

      const income = monthTxs
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0)

      const expenses = monthTxs
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)

      const monthNames = ['janv.', 'fév.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
      
      monthlyEvolution.push({
        month: monthNames[monthStart.getMonth()],
        revenus: income,
        depenses: expenses,
        solde: income - expenses
      })
    }

    // Top dépenses du mois
    const topExpenses = currentMonthTransactions
      .filter(t => t.type === 'expense')
      .map(t => ({
        id: t.id,
        description: t.description || 'Transaction',
        amount: Math.abs(Number(t.amount)),
        category: t.category?.name || 'Autres',
        date: t.date.toISOString()
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)

    // Répartition par compte
    const accountExpenses: Record<string, number> = {}
    recentTransactions.forEach(tx => {
      const accountName = tx.account.name
      accountExpenses[accountName] = (accountExpenses[accountName] || 0) + Math.abs(Number(tx.amount))
    })

    const accountData = Object.entries(accountExpenses)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)

    return NextResponse.json({
      monthlyIncome,
      monthlyExpenses,
      categoryData,
      monthlyEvolution,
      topExpenses,
      accountData
    })
  } catch (error: any) {
    console.error('Statistics API error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status }
    )
  }
}


