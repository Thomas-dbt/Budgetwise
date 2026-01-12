import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await getCurrentUserId()
    const { id } = params
    const body = await req.json()
    const { amount, type, date, description, categoryId, subCategoryId, pending, attachment, transferGroupId, toAccountId, accountId: newAccountId } = body

    const existing = await prisma.transaction.findUnique({
      where: { id },
      include: {
        account: true,
        toAccount: true,
        category: {
          include: { parent: true }
        }
      },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Transaction introuvable' }, { status: 404 })
    }
    if (existing.account.ownerId !== userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    let numericAmount = amount !== undefined ? Number(amount) : Number(existing.amount)
    if (amount !== undefined && Number.isNaN(numericAmount)) {
      return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
    }

    const normalizedType = type ? String(type).toLowerCase() : existing.type
    if (!['income', 'expense', 'transfer'].includes(normalizedType)) {
      return NextResponse.json({ error: 'Type de transaction invalide' }, { status: 400 })
    }

    const finalAccountId = newAccountId || existing.accountId
    const finalToAccountId = toAccountId !== undefined ? toAccountId : existing.toAccountId

    // Pour les transferts, vérifier que toAccountId est fourni
    if (normalizedType === 'transfer' && !finalToAccountId) {
      return NextResponse.json({ error: 'Le compte de destination est requis pour un transfert' }, { status: 400 })
    }

    // Pour les transferts, vérifier que le compte de destination existe et appartient à l'utilisateur
    if (normalizedType === 'transfer' && finalToAccountId) {
      const toAccount = await prisma.account.findUnique({ where: { id: finalToAccountId, ownerId: userId } })
      if (!toAccount) {
        return NextResponse.json({ error: 'Compte de destination introuvable' }, { status: 404 })
      }
      if (finalToAccountId === finalAccountId) {
        return NextResponse.json({ error: 'Le compte source et le compte de destination doivent être différents' }, { status: 400 })
      }
    }

    if (normalizedType === 'expense' && numericAmount > 0) {
      numericAmount = -Math.abs(numericAmount)
    }
    if (normalizedType === 'income' && numericAmount < 0) {
      numericAmount = Math.abs(numericAmount)
    }
    // Pour les transferts, le montant doit être positif
    if (normalizedType === 'transfer' && numericAmount < 0) {
      numericAmount = Math.abs(numericAmount)
    }

    const parsedDate = date ? new Date(date) : new Date(existing.date)
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'Date invalide' }, { status: 400 })
    }

    // Determine correct category ID logic
    let finalCategoryId = undefined
    if (categoryId !== undefined || subCategoryId !== undefined) {
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
      } else {
        finalCategoryId = null
      }
    }

    const updateData: any = {
      amount: numericAmount,
      type: normalizedType,
      date: parsedDate,
      description: description !== undefined ? description : existing.description,
      pending: pending !== undefined ? !!pending : existing.pending,
      transferGroupId: transferGroupId === undefined ? existing.transferGroupId : transferGroupId,
      toAccountId: normalizedType === 'transfer' ? finalToAccountId : null,
    }

    if (finalCategoryId !== undefined) {
      updateData.categoryId = finalCategoryId
    }

    if (newAccountId) {
      updateData.accountId = newAccountId
    }

    if (attachment !== undefined) {
      updateData.attachment = attachment
    }

    const oldAmount = Number(existing.amount)
    const oldType = existing.type
    const oldAccountId = existing.accountId
    const oldToAccountId = existing.toAccountId

    const result = await prisma.$transaction(async (txClient) => {
      // Annuler l'impact de l'ancienne transaction sur les comptes
      if (oldType === 'transfer' && oldToAccountId) {
        // Annuler le débit sur le compte source
        await txClient.account.update({
          where: { id: oldAccountId },
          data: {
            balance: {
              increment: oldAmount,
            },
          },
        })
        // Annuler le crédit sur le compte de destination
        await txClient.account.update({
          where: { id: oldToAccountId },
          data: {
            balance: {
              increment: -oldAmount,
            },
          },
        })
      } else {
        // Annuler l'impact sur le compte source pour income/expense
        await txClient.account.update({
          where: { id: oldAccountId },
          data: {
            balance: {
              increment: -oldAmount,
            },
          },
        })
      }

      const updatedTransaction = await txClient.transaction.update({
        where: { id },
        data: updateData,
        include: {
          category: {
            include: { parent: true }
          },
          account: true,
          toAccount: true
        },
      })

      // Appliquer l'impact de la nouvelle transaction
      const updatedFromAccount = await txClient.account.update({
        where: { id: finalAccountId },
        data: {
          balance: {
            increment: normalizedType === 'transfer' ? -numericAmount : numericAmount,
          },
        },
      })

      let updatedToAccount = null
      if (normalizedType === 'transfer' && finalToAccountId) {
        updatedToAccount = await txClient.account.update({
          where: { id: finalToAccountId },
          data: {
            balance: {
              increment: numericAmount,
            },
          },
        })
      }

      // Synchroniser les investissements Livrets liés aux comptes
      try {
        const accountsToSync = [finalAccountId]
        if (normalizedType === 'transfer' && finalToAccountId) {
          accountsToSync.push(finalToAccountId)
        }
        // Si les comptes ont changé, synchroniser aussi les anciens comptes
        if (oldAccountId !== finalAccountId) {
          accountsToSync.push(oldAccountId)
        }
        if (oldToAccountId && oldToAccountId !== finalToAccountId) {
          accountsToSync.push(oldToAccountId)
        }

        const uniqueAccounts = Array.from(new Set(accountsToSync))

        for (const accId of uniqueAccounts) {
          const linkedInvestments = await txClient.investmentAsset.findMany({
            where: {
              accountId: accId,
              category: 'Livret'
            }
          })

          const account = await txClient.account.findUnique({ where: { id: accId } })
          if (account) {
            for (const investment of linkedInvestments) {
              await txClient.investmentAsset.update({
                where: { id: investment.id },
                data: {
                  currentValue: account.balance,
                  lastValuationDate: new Date()
                }
              })
            }
          }
        }
      } catch (error: any) {
        if (!error?.message?.includes('accountId') && !error?.message?.includes('account')) {
          throw error
        }
      }

      return { updatedTransaction, updatedFromAccount, updatedToAccount }
    })

    const { updatedTransaction, updatedFromAccount, updatedToAccount } = result

    // Reconstruction of response format
    let resCategory = null
    let resSubCategory = null
    if (updatedTransaction.category) {
      if (updatedTransaction.category.parent) {
        resCategory = {
          id: updatedTransaction.category.parent.id,
          name: updatedTransaction.category.parent.name,
          emoji: updatedTransaction.category.parent.emoji
        }
        resSubCategory = {
          id: updatedTransaction.category.id,
          name: updatedTransaction.category.name
        }
      } else {
        resCategory = {
          id: updatedTransaction.category.id,
          name: updatedTransaction.category.name,
          emoji: updatedTransaction.category.emoji
        }
      }
    }

    return NextResponse.json({
      id: updatedTransaction.id,
      amount: Number(updatedTransaction.amount),
      type: updatedTransaction.type,
      date: updatedTransaction.date,
      description: updatedTransaction.description,
      pending: updatedTransaction.pending,
      attachment: updatedTransaction.attachment,
      category: resCategory,
      subCategory: resSubCategory,
      account: { id: updatedFromAccount.id, name: updatedFromAccount.name, balance: Number(updatedFromAccount.balance) },
      toAccount: updatedToAccount ? { id: updatedToAccount.id, name: updatedToAccount.name, balance: Number(updatedToAccount.balance) } : null,
    })
  } catch (error: any) {
    console.error('Transaction update error', error?.message || error)
    return NextResponse.json({ error: 'Impossible de modifier la transaction' }, { status: 500 })
  }
}
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await getCurrentUserId()
    const { id } = params
    const existing = await prisma.transaction.findUnique({
      where: { id },
      include: { account: true, toAccount: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Transaction introuvable' }, { status: 404 })
    }
    if (existing.account.ownerId !== userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    await prisma.$transaction(async (txClient) => {
      const amount = Number(existing.amount)

      // Annuler l'impact de la transaction sur les comptes
      if (existing.type === 'transfer' && existing.toAccountId) {
        // Annuler le débit sur le compte source (créditer)
        const updatedFromAccount = await txClient.account.update({
          where: { id: existing.accountId },
          data: {
            balance: {
              increment: amount,
            },
          },
        })

        // Annuler le crédit sur le compte de destination (débiter)
        const updatedToAccount = await txClient.account.update({
          where: { id: existing.toAccountId },
          data: {
            balance: {
              increment: -amount,
            },
          },
        })

        // Synchroniser les investissements Livrets liés aux deux comptes
        try {
          const accountsToSync = [existing.accountId, existing.toAccountId]
          for (const accId of accountsToSync) {
            const linkedInvestments = await txClient.investmentAsset.findMany({
              where: {
                accountId: accId,
                category: 'Livret'
              }
            })

            const account = await txClient.account.findUnique({ where: { id: accId } })
            if (account) {
              for (const investment of linkedInvestments) {
                await txClient.investmentAsset.update({
                  where: { id: investment.id },
                  data: {
                    currentValue: account.balance,
                    lastValuationDate: new Date()
                  }
                })
              }
            }
          }
        } catch (error: any) {
          if (!error?.message?.includes('accountId') && !error?.message?.includes('account')) {
            throw error
          }
        }
      } else {
        // Pour income/expense, annuler l'impact sur le compte source
        const updatedAccount = await txClient.account.update({
          where: { id: existing.accountId },
          data: {
            balance: {
              increment: -amount,
            },
          },
        })

        // Synchroniser les investissements Livrets liés à ce compte
        try {
          const linkedInvestments = await txClient.investmentAsset.findMany({
            where: {
              accountId: existing.accountId,
              category: 'Livret'
            }
          })

          for (const investment of linkedInvestments) {
            await txClient.investmentAsset.update({
              where: { id: investment.id },
              data: {
                currentValue: updatedAccount.balance,
                lastValuationDate: new Date()
              }
            })
          }
        } catch (error: any) {
          if (!error?.message?.includes('accountId') && !error?.message?.includes('account')) {
            throw error
          }
        }
      }



      await txClient.transaction.delete({ where: { id } })
    })

    return new NextResponse(null, { status: 204 })
  } catch (error: any) {
    console.error('Transaction delete error', error?.message || error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json({ error: 'Impossible de supprimer la transaction' }, { status })
  }
}

