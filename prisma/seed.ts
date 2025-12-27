import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('admin12345', 10)
  const user = await prisma.user.upsert({
    where: { email: 'admin@budgetwise.local' },
    update: {},
    create: { email: 'admin@budgetwise.local', passwordHash, name: 'Admin' }
  })

  const categories = [
    { name: 'Alimentation', emoji: '🍽️' },
    { name: 'Transport', emoji: '🚌' },
    { name: 'Logement', emoji: '🏠' },
    { name: 'Loisirs', emoji: '🎮' },
    { name: 'Santé', emoji: '🩺' },
    { name: 'Shopping', emoji: '🛍️' },
    { name: 'Abonnements', emoji: '🔁' },
    { name: 'Énergie', emoji: '⚡' },
    { name: 'Assurances', emoji: '🛡️' },
    { name: 'Voyages', emoji: '✈️' },
    { name: 'Épargne & investissement', emoji: '💼' },
    { name: 'Autres', emoji: '📦' }
  ]

  for (const c of categories) {
    await prisma.category.upsert({ where: { name: c.name }, update: {}, create: c })
  }

  const account = await prisma.account.create({
    data: {
      name: 'Compte courant',
      bank: 'BNP Paribas',
      type: 'checking',
      balance: 2000,
      ownerId: user.id,
      isJoint: true,
      jointAccessCode: 'JOINT123'
    }
  })

  // Créer des transactions pour les 6 derniers mois
  const now = new Date()
  const transactions = []
  
  // Trouver la catégorie Alimentation
  const alimentationCat = await prisma.category.findUnique({ where: { name: 'Alimentation' } })
  const transportCat = await prisma.category.findUnique({ where: { name: 'Transport' } })
  const loisirsCat = await prisma.category.findUnique({ where: { name: 'Loisirs' } })
  
  // Transactions pour les 6 derniers mois
  for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 15)
    
    // Revenus mensuels
    transactions.push({
      accountId: account.id,
      amount: 2000 + Math.random() * 500,
      type: 'income',
      date: monthDate,
      description: 'Salaire',
    })
    
    // Dépenses variées
    transactions.push({
      accountId: account.id,
      amount: -(50 + Math.random() * 100),
      type: 'expense',
      date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 5),
      description: 'Courses',
      categoryId: alimentationCat?.id,
    })
    
    transactions.push({
      accountId: account.id,
      amount: -(100 + Math.random() * 200),
      type: 'expense',
      date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 10),
      description: 'Essence',
      categoryId: transportCat?.id,
    })
    
    transactions.push({
      accountId: account.id,
      amount: -(30 + Math.random() * 70),
      type: 'expense',
      date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 20),
      description: 'Loisirs',
      categoryId: loisirsCat?.id,
    })
  }
  
  await prisma.transaction.createMany({
    data: transactions
  })

  // Créer des événements de calendrier
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  
  // Loyer - mensuel, le 1er du mois
  await prisma.calendarEvent.create({
    data: {
      userId: user.id,
      title: 'Loyer',
      type: 'debit',
      amount: 850,
      dueDate: new Date(currentYear, currentMonth, 1),
      recurring: 'monthly',
      confirmed: false
    }
  })

  // Netflix - mensuel, le 5 du mois
  await prisma.calendarEvent.create({
    data: {
      userId: user.id,
      title: 'Netflix',
      type: 'debit',
      amount: 13.99,
      dueDate: new Date(currentYear, currentMonth, 5),
      recurring: 'monthly',
      confirmed: false
    }
  })

  // Assurance Auto - mensuel, le 10 du mois
  await prisma.calendarEvent.create({
    data: {
      userId: user.id,
      title: 'Assurance Auto',
      type: 'debit',
      amount: 65,
      dueDate: new Date(currentYear, currentMonth, 10),
      recurring: 'monthly',
      confirmed: true
    }
  })

  // Électricité EDF - mensuel, le 15 du mois
  await prisma.calendarEvent.create({
    data: {
      userId: user.id,
      title: 'Électricité EDF',
      type: 'debit',
      amount: 75,
      dueDate: new Date(currentYear, currentMonth, 15),
      recurring: 'monthly',
      confirmed: true
    }
  })

  // Créer des investissements
  // Apple Inc.
  const appleAsset = await prisma.investmentAsset.create({
    data: {
      userId: user.id,
      symbol: 'AAPL',
      kind: 'stock',
      name: 'Apple Inc.'
    }
  })
  await prisma.position.create({
    data: {
      assetId: appleAsset.id,
      quantity: 10,
      costBasis: 150.00 // Prix d'achat moyen
    }
  })

  // Vanguard S&P 500
  const vooAsset = await prisma.investmentAsset.create({
    data: {
      userId: user.id,
      symbol: 'VOO',
      kind: 'etf',
      name: 'Vanguard S&P 500'
    }
  })
  await prisma.position.create({
    data: {
      assetId: vooAsset.id,
      quantity: 5,
      costBasis: 400.00
    }
  })

  // Bitcoin
  const btcAsset = await prisma.investmentAsset.create({
    data: {
      userId: user.id,
      symbol: 'BTC',
      kind: 'crypto',
      name: 'Bitcoin'
    }
  })
  await prisma.position.create({
    data: {
      assetId: btcAsset.id,
      quantity: 0.05,
      costBasis: 45000.00
    }
  })

  await prisma.accountShare.create({
    data: {
      accountId: account.id,
      email: 'invite@budgetwise.local',
      role: 'viewer',
      accessCode: 'JOINT123',
      expiresAt: new Date(new Date().setMonth(new Date().getMonth() + 1))
    }
  })

  console.log('Seed OK')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})


