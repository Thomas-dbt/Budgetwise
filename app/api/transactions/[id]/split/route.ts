
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'
import { Decimal } from '@prisma/client/runtime/library'

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const userId = await getCurrentUserId()
        const transactionId = params.id
        const body = await req.json()
        const { splits } = body // Array of { amount, description, categoryId, pending? }

        if (!splits || !Array.isArray(splits) || splits.length < 2) {
            return NextResponse.json({ error: 'Il faut au moins 2 parties pour diviser une transaction' }, { status: 400 })
        }

        // 1. Fetch original transaction
        const originalTransaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { account: true, category: true }
        })

        if (!originalTransaction) {
            return NextResponse.json({ error: 'Transaction introuvable' }, { status: 404 })
        }

        // Verify ownership
        if (originalTransaction.account.ownerId !== userId) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
        }

        // Verify type (MVP constraint)
        if (originalTransaction.type === 'transfer') {
            return NextResponse.json({ error: 'Le découpage des transferts n\'est pas encore supporté' }, { status: 400 })
        }

        // 2. Validate totals
        const totalSplitAmount = splits.reduce((acc: number, split: any) => acc + Number(split.amount), 0)
        // We compare absolute values because expenses are negative in DB but usually handled as positive in UI input
        // However, let's assume UI sends positive amounts and we apply correct sign based on original type
        const originalAmountAbs = Math.abs(Number(originalTransaction.amount))

        // Allow a small epsilon for float errors, though we should use Decimals eventually
        if (Math.abs(totalSplitAmount - originalAmountAbs) > 0.01) {
            return NextResponse.json({
                error: `Le total des parties (${totalSplitAmount}) ne correspond pas au montant original (${originalAmountAbs})`
            }, { status: 400 })
        }

        const sign = Number(originalTransaction.amount) < 0 ? -1 : 1

        // 3. Perform atomic update
        const result = await prisma.$transaction(async (txClient) => {
            // Mark original as parent
            await txClient.transaction.update({
                where: { id: transactionId },
                data: {
                    hasSplits: true,
                    // We keep the original amount/category/etc for record keeping, but it won't be shown in lists
                }
            })

            // Create child transactions
            const createdSplits = []
            for (const split of splits) {
                // Ensure amount has correct sign
                const splitAmount = Math.abs(Number(split.amount)) * sign

                const newTx = await txClient.transaction.create({
                    data: {
                        parentId: transactionId,
                        accountId: originalTransaction.accountId,
                        amount: splitAmount,
                        type: originalTransaction.type,
                        date: originalTransaction.date, // Same date as parent
                        description: split.description || originalTransaction.description, // Fallback to parent desc
                        categoryId: split.categoryId || originalTransaction.categoryId, // Fallback to parent cat
                        pending: split.pending !== undefined ? split.pending : originalTransaction.pending,
                        hasSplits: false,
                        // Copy attachment?? Maybe not, as it might apply to the whole. 
                        // Let's leave attachment on parent for now, or copy it? 
                        // If we hide parent, we lose access to attachment. Let's copy reference for now.
                        attachment: originalTransaction.attachment
                    }
                })
                createdSplits.push(newTx)
            }

            return createdSplits
        })

        return NextResponse.json({ success: true, splits: result })

    } catch (error: any) {
        console.error('Split transaction error', error)
        return NextResponse.json({ error: 'Erreur lors du découpage' }, { status: 500 })
    }
}
