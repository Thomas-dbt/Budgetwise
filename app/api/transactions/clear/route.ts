import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json().catch(() => ({}))
    const { accountId } = body as { accountId?: string }

    const whereClause = accountId
      ? { accountId, account: { ownerId: userId } }
      : { account: { ownerId: userId } }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      select: { id: true, amount: true, accountId: true },
    })

    if (transactions.length === 0) {
      return NextResponse.json({ cleared: 0 })
    }

    const totalsByAccount = transactions.reduce<Record<string, number>>((acc, tx) => {
      acc[tx.accountId] = (acc[tx.accountId] || 0) + Number(tx.amount)
      return acc
    }, {})

    await prisma.$transaction(async (tx) => {
      await tx.transaction.deleteMany({ where: { id: { in: transactions.map((tx) => tx.id) } } })
      await Promise.all(
        Object.entries(totalsByAccount).map(([accId, delta]) =>
          tx.account.update({
            where: { id: accId },
            data: {
              balance: {
                decrement: delta,
              },
            },
          })
        )
      )
    })

    return NextResponse.json({ cleared: transactions.length })
  } catch (error: any) {
    console.error('Clear transactions error', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json({ error: 'Impossible de supprimer les transactions' }, { status })
  }
}


