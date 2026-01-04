import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'

export async function POST(req: Request) {
    try {
        const userId = await getCurrentUserId()
        const body = await req.json()
        const { transactionIds, categoryId, subCategoryId } = body

        if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
            return NextResponse.json({ error: 'Aucune transaction sélectionnée' }, { status: 400 })
        }

        // Verify ownership of all transactions
        const counts = await prisma.transaction.count({
            where: {
                id: { in: transactionIds },
                account: { ownerId: userId }
            }
        })

        if (counts !== transactionIds.length) {
            return NextResponse.json({ error: 'Certaines transactions sont introuvables ou non autorisées' }, { status: 403 })
        }

        let finalCategoryId = null

        // Determine correct category ID logic
        if (subCategoryId) {
            const sub = await prisma.category.findUnique({ where: { id: subCategoryId } })
            if (!sub) return NextResponse.json({ error: 'Sous-catégorie inconnue' }, { status: 400 })

            if (categoryId && sub.parentId !== categoryId) {
                return NextResponse.json({ error: 'La sous-catégorie ne correspond pas à la catégorie sélectionnée' }, { status: 400 })
            }
            finalCategoryId = subCategoryId
        } else if (categoryId) {
            const cat = await prisma.category.findUnique({ where: { id: categoryId } })
            if (!cat) return NextResponse.json({ error: 'Catégorie inconnue' }, { status: 400 })
            finalCategoryId = categoryId
        }

        // Perform bulk update
        // Note: This does NOT update investments/balances since we are only changing categories, which usually doesn't affect balances unless we were changing amounts or accounts (which we aren't here).

        await prisma.transaction.updateMany({
            where: {
                id: { in: transactionIds }
            },
            data: {
                categoryId: finalCategoryId
                // No subCategoryId field in DB, relying on unified categoryId
            }
        })

        return NextResponse.json({ success: true, count: transactionIds.length })
    } catch (error: any) {
        console.error('Bulk update error', error)
        return NextResponse.json({ error: 'Impossible de mettre à jour les transactions' }, { status: 500 })
    }
}
