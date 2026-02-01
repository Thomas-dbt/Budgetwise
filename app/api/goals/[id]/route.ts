
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const userId = await getCurrentUserId()

        const goal = await prisma.savingsGoal.findUnique({
            where: { id: params.id },
            include: {
                transactions: {
                    orderBy: { date: 'desc' },
                    include: {
                        account: { select: { name: true } }
                    }
                }
            }
        })

        if (!goal || goal.userId !== userId) {
            return NextResponse.json({ error: 'Objectif non trouvé' }, { status: 404 })
        }

        return NextResponse.json(goal)
    } catch (error) {
        console.error('Error fetching goal details:', error)
        return NextResponse.json({ error: 'Erreur lors de la récupération de l\'objectif' }, { status: 500 })
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const userId = await getCurrentUserId()
        const body = await req.json()
        const { name, targetAmount, currentAmount, deadline, icon, color } = body

        // Ensure user owns the goal
        const existing = await prisma.savingsGoal.findUnique({
            where: { id: params.id },
        })

        if (!existing || existing.userId !== userId) {
            return NextResponse.json({ error: 'Objectif non trouvé' }, { status: 404 })
        }

        const updated = await prisma.savingsGoal.update({
            where: { id: params.id },
            data: {
                name,
                targetAmount,
                currentAmount,
                deadline: deadline ? new Date(deadline) : undefined, // undefined to ignore if not passed, but null to clear? Body usually omits if unchanged.
                // If we want to allow clearing deadline, input should send null.
                // Prisma treats undefined as "do nothing", null as "set to null".
                // Let's assume body contains full update or partial.
                ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
                icon,
                color
            }
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error('Error updating goal:', error)
        return NextResponse.json({ error: 'Erreur lors de la mise à jour de l\'objectif' }, { status: 500 })
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const userId = await getCurrentUserId()

        const existing = await prisma.savingsGoal.findUnique({
            where: { id: params.id },
        })

        if (!existing || existing.userId !== userId) {
            return NextResponse.json({ error: 'Objectif non trouvé' }, { status: 404 })
        }

        await prisma.savingsGoal.delete({
            where: { id: params.id },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting goal:', error)
        return NextResponse.json({ error: 'Erreur lors de la suppression de l\'objectif' }, { status: 500 })
    }
}
