
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
    try {
        const userId = await getCurrentUserId()
        const goals = await prisma.savingsGoal.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        })
        return NextResponse.json(goals)
    } catch (error) {
        console.error('Error fetching goals:', error)
        return NextResponse.json({ error: 'Erreur lors de la récupération des objectifs' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const userId = await getCurrentUserId()
        const body = await req.json()
        const { name, targetAmount, deadline, icon, color } = body

        if (!name || !targetAmount) {
            return NextResponse.json({ error: 'Nom et montant cible requis' }, { status: 400 })
        }

        const goal = await prisma.savingsGoal.create({
            data: {
                userId,
                name,
                targetAmount,
                deadline: deadline ? new Date(deadline) : null,
                icon,
                color
            }
        })

        return NextResponse.json(goal)
    } catch (error) {
        console.error('Error creating goal:', error)
        return NextResponse.json({ error: 'Erreur lors de la création de l\'objectif' }, { status: 500 })
    }
}
