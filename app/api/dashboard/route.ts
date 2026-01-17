import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'

export async function GET() {
  // #region agent log
  await fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'app/api/dashboard/route.ts:5', message: 'Dashboard API GET called', data: { timestamp: Date.now() }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' }) }).catch(() => { });
  // #endregion
  try {
    let userId
    try {
      // #region agent log
      await fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'app/api/dashboard/route.ts:9', message: 'Before getCurrentUserId', data: { timestamp: Date.now() }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
      // #endregion
      userId = await getCurrentUserId()
      // #region agent log
      await fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'app/api/dashboard/route.ts:12', message: 'After getCurrentUserId', data: { hasUserId: !!userId, timestamp: Date.now() }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
      // #endregion
    } catch (authError) {
      // #region agent log
      await fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'app/api/dashboard/route.ts:15', message: 'Auth error in dashboard API', data: { errorMessage: authError instanceof Error ? authError.message : String(authError), timestamp: Date.now() }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
      // #endregion
      console.error('Dashboard API auth error:', authError)
      return NextResponse.json(
        { error: 'Non autorisé. Veuillez vous reconnecter.' },
        { status: 401 }
      )
    }
    // Date du début et fin du mois actuel
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

    // Formater les dates correctement
    const formatDateForResponse = (date: Date) => {
      return date.toISOString()
    }

    // Exécuter les requêtes indépendantes en parallèle
    const [
      accounts,
      monthTransactions,
      recentTransactions,
      sixMonthTransactions
    ] = await Promise.all([
      // 1. Tous les comptes pour le solde total
      prisma.account.findMany({ where: { ownerId: userId } }),

      // 2. Transactions du mois en cours
      prisma.transaction.findMany({
        where: {
          account: { ownerId: userId },
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        include: { category: true, account: true, toAccount: true },
      }),

      // 3. Transactions récentes (10 dernières)
      prisma.transaction.findMany({
        where: { account: { ownerId: userId } },
        take: 10,
        orderBy: { date: 'desc' },
        include: { category: true, account: true },
      }),

      // 4. Transactions des 6 derniers mois pour le graphique (en une seule requête)
      prisma.transaction.findMany({
        where: {
          account: { ownerId: userId },
          date: { gte: sixMonthsAgo, lte: endOfMonth },
        },
        include: {
          account: true,
          toAccount: true,
          category: true
        },
        orderBy: { date: 'asc' }
      })
    ])

    const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0)

    // Calculs pour le mois en cours (inchangés)
    const monthlyIncome = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const monthlyExpenses = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)

    const investmentKeywords = ['épargne', 'epargne', 'investissement', 'invest', 'savings', 'bourse', 'pea', 'cto', 'livret', 'av']
    const excludedKeywords = ['immobilier', 'apport', 'notaire', 'capital'] // removed 'transfert' as it might be relevant

    const savingsAccountTypes = ['savings', 'investment']

    // Helper to check if a transaction is an investment/saving
    const isInvestmentTx = (t: any) => {
      if (!t.category) return false
      const catName = t.category.name.toLowerCase()
      const isInvestment = investmentKeywords.some(kw => catName.includes(kw))
      if (!isInvestment) return false
      const isExcluded = excludedKeywords.some(kw => catName.includes(kw))
      if (isExcluded) return false
      return true
    }

    // Calcul de l'épargne (tout confondu: dépenses + transferts)
    const monthlyInvested = monthTransactions
      .filter(t => isInvestmentTx(t))
      .reduce((sum, t) => {
        const amount = Math.abs(Number(t.amount))

        if (t.type === 'expense') {
          return sum + amount
        }

        if (t.type === 'income') {
          return sum - amount
        }

        if (t.type === 'transfer') {
          const sourceIsSavings = savingsAccountTypes.includes(t.account.type)
          const destIsSavings = t.toAccount ? savingsAccountTypes.includes(t.toAccount.type) : false

          if (sourceIsSavings && destIsSavings) return sum
          if (sourceIsSavings && !destIsSavings) return sum - amount
          if (!sourceIsSavings && destIsSavings) return sum + amount
          if (!sourceIsSavings && !destIsSavings) return sum + amount // Ambiguous but tagged as savings
        }

        return sum
      }, 0)

    // Calcul spécifique des transferts vers l'épargne (pour déduction du Reste à Vivre)
    // On se base uniquement sur le type de compte (Checking -> Savings) et non sur la catégorie
    const investedViaTransfer = monthTransactions
      .filter(t => t.type === 'transfer')
      .reduce((sum, t) => {
        const amount = Math.abs(Number(t.amount))
        const sourceIsSavings = savingsAccountTypes.includes(t.account.type)
        const destIsSavings = t.toAccount ? savingsAccountTypes.includes(t.toAccount.type) : false

        // On ne compte positivement que ce qui rentre sur un compte épargne venant d'un compte courant/externe
        if (!sourceIsSavings && destIsSavings) return sum + amount
        if (!sourceIsSavings && !destIsSavings) {
          // Cas ambigu : Checking -> Checking.
          // Si l'utilisateur l'a explicitement tagué "Epargne", on le compte.
          // Sinon, on ignore (virement interne de confort).
          return isInvestmentTx(t) ? sum + amount : sum
        }

        // Les retraits (Epargne -> Courant) augmentent le reste à vivre, donc on les soustrait de l'épargne réalisée
        if (sourceIsSavings && !destIsSavings) return sum - amount

        return sum
      }, 0)

    const savingsRate = monthlyIncome > 0
      ? parseFloat((Math.max(0, monthlyInvested) / monthlyIncome * 100).toFixed(1))
      : 0.0

    // Traitement des données pour le graphique (en mémoire plutôt qu'en SQL séquentiel)
    const monthlyData = []
    const monthNames = ['janv.', 'fév.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

    for (let i = 5; i >= 0; i--) {
      // Recalculer les bornes pour le filtrage en mémoire
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const currentMonthIndex = monthDate.getMonth()
      const currentYear = monthDate.getFullYear()

      const monthTxs = sixMonthTransactions.filter(t => {
        const d = new Date(t.date)
        return d.getMonth() === currentMonthIndex && d.getFullYear() === currentYear
      })

      const income = monthTxs
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0)

      const expenses = monthTxs
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)

      // Calculer les transferts d'épargne pour l'historique (même logique que investedViaTransfer)
      const transfers = monthTxs
        .filter(t => t.type === 'transfer')
        .reduce((sum, t) => {
          const amount = Math.abs(Number(t.amount))
          const sourceIsSavings = savingsAccountTypes.includes(t.account.type)
          const destIsSavings = t.toAccount ? savingsAccountTypes.includes(t.toAccount.type) : false

          if (!sourceIsSavings && destIsSavings) return sum + amount
          if (!sourceIsSavings && !destIsSavings) {
            return isInvestmentTx(t) ? sum + amount : sum
          }
          if (sourceIsSavings && !destIsSavings) return sum - amount

          return sum
        }, 0)

      monthlyData.push({
        month: monthNames[currentMonthIndex],
        revenus: income,
        depenses: expenses,
        transferts: transfers // Allow negative values to show withdrawals from savings
      })
    }

    // #region agent log
    await fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'app/api/dashboard/route.ts:104', message: 'Before returning success response', data: { totalBalance, timestamp: Date.now() }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' }) }).catch(() => { });
    // #endregion
    return NextResponse.json({
      totalBalance: totalBalance || 0,
      monthlyIncome: monthlyIncome || 0,
      monthlyExpenses: monthlyExpenses || 0,
      savingsRate: savingsRate || 0,
      investedViaTransfer: investedViaTransfer || 0,
      recentTransactions: recentTransactions.map(t => ({
        id: t.id,
        description: t.description || 'Transaction',
        amount: Number(t.amount),
        type: t.type,
        date: formatDateForResponse(t.date),
        category: t.category ? { name: t.category.name, emoji: t.category.emoji } : null,
        account: { name: t.account.name }
      })),
      monthlyEvolution: monthlyData
    })
  } catch (error) {
    // #region agent log
    await fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'app/api/dashboard/route.ts:121', message: 'Error in dashboard API catch block', data: { errorMessage: error instanceof Error ? error.message : String(error), timestamp: Date.now() }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
    // #endregion
    console.error('Dashboard API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json(
      { error: `Erreur lors du chargement des données: ${errorMessage}` },
      { status: 500 }
    )
  }
}

