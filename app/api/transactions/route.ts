import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'

export async function GET(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const { searchParams } = new URL(req.url)
    const accountId = searchParams.get('accountId') || undefined
    const take = Number(searchParams.get('take') || 50)
    const where = accountId
      ? { accountId, account: { ownerId: userId } }
      : { account: { ownerId: userId } }
    let txs
    try {
      txs = await prisma.transaction.findMany({
        where,
        orderBy: { date: 'desc' },
        take,
        include: {
          account: true,
          toAccount: true,
          category: {
            include: { parent: true }
          }
        } as any, // Cast include to any
      }) as any[] // Cast result to any[]
    } catch (includeError: any) {
      // Fallback
      txs = await prisma.transaction.findMany({
        where,
        orderBy: { date: 'desc' },
        take,
        include: {
          account: true,
          category: {
            include: { parent: true }
          }
        } as any, // Cast include to any
      }) as any[] // Cast result to any[]
      // Manually add toAccount as null for now
      txs = txs.map((tx: any) => ({ ...tx, toAccount: null }))
    }

    const formattedTxs = txs.map((tx: any) => {
      // Logic to map single category back to category/subCategory pair
      let category = null
      let subCategory = null

      if (tx.category) {
        if (tx.category.parent) {
          // It's a subcategory
          category = {
            id: tx.category.parent.id,
            name: tx.category.parent.name,
            emoji: tx.category.parent.emoji
          }
          subCategory = {
            id: tx.category.id,
            name: tx.category.name
          }
        } else {
          // It's a top category
          category = {
            id: tx.category.id,
            name: tx.category.name,
            emoji: tx.category.emoji
          }
        }
      }

      return {
        ...tx,
        category,
        subCategory,
        // Ensure no raw objects leak if not needed, but spread handles most
      }
    })

    return NextResponse.json(formattedTxs)
  } catch (error: any) {
    console.error('Transactions GET error', error)
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json()
    const { accountId, amount, type, date, description, categoryId, subCategoryId, pending, attachment, transferGroupId, toAccountId } = body

    if (!accountId || amount === undefined || amount === null || !type || !date) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    const account = await prisma.account.findUnique({ where: { id: accountId, ownerId: userId } })
    if (!account) {
      return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 })
    }

    let numericAmount = Number(amount)
    if (Number.isNaN(numericAmount)) {
      return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
    }

    const normalizedType = String(type).toLowerCase()
    if (!['income', 'expense', 'transfer'].includes(normalizedType)) {
      return NextResponse.json({ error: 'Type de transaction invalide' }, { status: 400 })
    }

    // Pour les transferts, vérifier que toAccountId est fourni
    if (normalizedType === 'transfer' && !toAccountId) {
      return NextResponse.json({ error: 'Le compte de destination est requis pour un transfert' }, { status: 400 })
    }

    // Pour les transferts, vérifier que le compte de destination existe et appartient à l'utilisateur
    if (normalizedType === 'transfer' && toAccountId) {
      const toAccount = await prisma.account.findUnique({ where: { id: toAccountId, ownerId: userId } })
      if (!toAccount) {
        return NextResponse.json({ error: 'Compte de destination introuvable' }, { status: 404 })
      }
      if (toAccountId === accountId) {
        return NextResponse.json({ error: 'Le compte source et le compte de destination doivent être différents' }, { status: 400 })
      }
    }

    if (normalizedType === 'expense' && numericAmount > 0) {
      numericAmount = -Math.abs(numericAmount)
    }
    if (normalizedType === 'income' && numericAmount < 0) {
      numericAmount = Math.abs(numericAmount)
    }
    // Pour les transferts, le montant doit être positif (on débite le compte source)
    if (normalizedType === 'transfer' && numericAmount < 0) {
      numericAmount = Math.abs(numericAmount)
    }

    const parsedDate = new Date(date)
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'Date invalide' }, { status: 400 })
    }

    let finalCategoryId = null

    // Determine correct category ID logic
    if (subCategoryId) {
      const sub = await prisma.category.findUnique({ where: { id: subCategoryId } }) as any // check existence
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

    const result = await prisma.$transaction(async (txClient) => {
      const created = await txClient.transaction.create({
        data: {
          accountId,
          toAccountId: normalizedType === 'transfer' ? toAccountId : null,
          amount: numericAmount,
          type: normalizedType,
          date: parsedDate,
          description: description || null,
          pending: !!pending,
          categoryId: finalCategoryId, // Unified field
          // subCategoryId removed
          attachment: attachment ? String(attachment) : null,
          transferGroupId: transferGroupId || null,
        },
        include: {
          category: {
            include: { parent: true }
          },
          account: true,
          toAccount: true
        } as any,
      }) as any

      // Mettre à jour le solde du compte source
      const updatedFromAccount = await txClient.account.update({
        where: { id: accountId },
        data: {
          balance: {
            increment: normalizedType === 'transfer' ? -numericAmount : numericAmount,
          },
        },
      })

      // Pour les transferts, mettre à jour aussi le solde du compte de destination
      let updatedToAccount = null
      if (normalizedType === 'transfer' && toAccountId) {
        updatedToAccount = await txClient.account.update({
          where: { id: toAccountId },
          data: {
            balance: {
              increment: numericAmount,
            },
          },
        })
      }

      // Synchroniser les investissements Livrets liés aux comptes
      try {
        const linkedInvestments = await txClient.investmentAsset.findMany({
          where: {
            accountId: accountId,
            category: 'Livret'
          }
        })

        for (const investment of linkedInvestments) {
          await txClient.investmentAsset.update({
            where: { id: investment.id },
            data: {
              currentValue: updatedFromAccount.balance,
              lastValuationDate: new Date()
            }
          })
        }

        // Si c'est un transfert, synchroniser aussi les investissements du compte de destination
        if (normalizedType === 'transfer' && toAccountId && updatedToAccount) {
          const toLinkedInvestments = await txClient.investmentAsset.findMany({
            where: {
              accountId: toAccountId,
              category: 'Livret'
            }
          })

          for (const investment of toLinkedInvestments) {
            await txClient.investmentAsset.update({
              where: { id: investment.id },
              data: {
                currentValue: updatedToAccount.balance,
                lastValuationDate: new Date()
              }
            })
          }
        }
      } catch (error: any) {
        if (!error?.message?.includes('accountId') && !error?.message?.includes('account')) {
          throw error
        }
      }

      return { created, updatedFromAccount, updatedToAccount }
    })

    const { created, updatedFromAccount, updatedToAccount } = result

    // Reconstruction of response format
    let resCategory = null
    let resSubCategory = null
    if (created.category) {
      if (created.category.parent) {
        resCategory = {
          id: created.category.parent.id,
          name: created.category.parent.name,
          emoji: created.category.parent.emoji
        }
        resSubCategory = {
          id: created.category.id,
          name: created.category.name
        }
      } else {
        resCategory = {
          id: created.category.id,
          name: created.category.name,
          emoji: created.category.emoji
        }
      }
    }

    return NextResponse.json({
      id: created.id,
      amount: Number(created.amount),
      type: created.type,
      date: created.date,
      description: created.description,
      pending: created.pending,
      attachment: created.attachment,
      category: resCategory,
      subCategory: resSubCategory,
      account: { id: updatedFromAccount.id, name: updatedFromAccount.name, balance: Number(updatedFromAccount.balance) },
      toAccount: updatedToAccount ? { id: updatedToAccount.id, name: updatedToAccount.name, balance: Number(updatedToAccount.balance) } : null,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Transaction create error', error?.message, error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json({ error: 'Impossible d\'ajouter la transaction' }, { status })
  }
}
