import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'

export async function GET(req: Request) {
    try {
        const userId = await getCurrentUserId()
        const { searchParams } = new URL(req.url)
        const month = searchParams.get('month') // "YYYY-MM"

        // Fetch all applicable budgets: global + specific month
        const budgets = await prisma.budget.findMany({
            where: {
                userId,
                month: { in: ['global', month || ''].filter(Boolean) }
            },
            include: { category: true }
        })

        // Logic: Return one budget per category.
        // Priority: Month specific > Global
        const effectiveBudgets = new Map()

        // 1. Load globals first
        budgets.filter((b: any) => b.month === 'global').forEach((b: any) => {
            effectiveBudgets.set(b.categoryId, { ...b, isGlobal: true })
        })

        // 2. Override with month specific
        if (month) {
            budgets.filter((b: any) => b.month === month).forEach((b: any) => {
                effectiveBudgets.set(b.categoryId, { ...b, isGlobal: false })
            })
        }

        return NextResponse.json(Array.from(effectiveBudgets.values()))
    } catch (error) {
        console.error('Budgets GET error', error)
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
}

export async function POST(req: Request) {
    try {
        const userId = await getCurrentUserId()
        const body = await req.json()
        const { categoryId, amount, month } = body // month is optional ("YYYY-MM"), if missing -> "global"

        if (!categoryId || amount === undefined) {
            return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
        }

        const targetMonth = month || 'global'

        const budget = await prisma.budget.upsert({
            where: {
                categoryId_month: { // Composite unique key from schema
                    categoryId,
                    month: targetMonth
                }
            },
            update: {
                amount: Number(amount),
            },
            create: {
                userId,
                categoryId,
                amount: Number(amount),
                month: targetMonth
            },
        })

        return NextResponse.json(budget)
    } catch (error) {
        console.error('Budget create/update error', error)
        return NextResponse.json({ error: 'Impossible de sauvegarder le budget' }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    try {
        const userId = await getCurrentUserId()

        await prisma.budget.deleteMany({
            where: { userId }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Budget delete error', error)
        return NextResponse.json({ error: 'Impossible de supprimer les budgets' }, { status: 500 })
    }
}
