import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'

interface RequestBody {
  name?: string
  bank?: string | null
  type?: string
  balance?: number
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await getCurrentUserId()
    const { id } = params
    const body = (await request.json()) as RequestBody & { isJoint?: boolean; jointAccessCode?: string }

    const account = await prisma.account.findUnique({ where: { id, ownerId: userId } })
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const updatedName = body.name?.trim().length ? body.name.trim() : account.name
    const updatedBankValue =
      body.bank !== undefined
        ? (body.bank && body.bank.trim().length ? body.bank.trim() : null)
        : account.bank
    const updatedType = body.type || account.type
    const updatedBalance = body.balance !== undefined ? body.balance : account.balance
    const updatedIsJoint = body.isJoint !== undefined ? body.isJoint : account.isJoint
    const updatedJointCode =
      body.jointAccessCode !== undefined
        ? (body.jointAccessCode && body.jointAccessCode.trim().length ? body.jointAccessCode.trim() : null)
        : account.jointAccessCode

    if (updatedIsJoint && (!updatedJointCode || updatedJointCode.length < 4)) {
      return NextResponse.json({
        error: 'Veuillez définir un code d’accès commun (4 caractères minimum)'
      }, { status: 400 })
    }

    const duplicate = await prisma.account.findFirst({
      where: {
        ownerId: account.ownerId,
        name: updatedName,
        bank: updatedBankValue,
        NOT: { id }
      }
    })

    if (duplicate) {
      return NextResponse.json({
        error: 'Un compte avec ce nom et cette banque existe déjà',
        details: 'duplicate-account'
      }, { status: 409 })
    }

    const updated = await prisma.account.update({
      where: { id },
      data: {
        name: updatedName,
        bank: updatedBankValue,
        type: updatedType,
        balance: updatedBalance,
        isJoint: updatedIsJoint,
        jointAccessCode: updatedIsJoint ? updatedJointCode : null
      }
    })

    if (!updatedIsJoint) {
      await prisma.accountShare.deleteMany({ where: { accountId: id } })
    }

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error updating account:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      {
        error: error?.message || 'Failed to update account',
        details: error?.code,
      },
      { status },
    )
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await getCurrentUserId()
    const { id } = params
    const existing = await prisma.account.findUnique({ where: { id, ownerId: userId } })
    if (!existing) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    await prisma.$transaction([
      prisma.transaction.deleteMany({ where: { accountId: id } }),
      prisma.accountShare.deleteMany({ where: { accountId: id } }),
      prisma.account.delete({ where: { id } })
    ])

    return new NextResponse(null, { status: 204 })
  } catch (error: any) {
    console.error('Error deleting account:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      {
        error: error?.message || 'Failed to delete account',
        details: error?.code,
      },
      { status },
    )
  }
}
