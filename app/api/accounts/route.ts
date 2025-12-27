import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    const accounts = await prisma.account.findMany({
      where: { ownerId: userId },
      include: {
        transactions: { take: 5, orderBy: { date: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(accounts)
  } catch (error: any) {
    console.error('Accounts GET error', error)
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json()
    const { name, bank, type, balance } = body
    const isJoint = !!body.isJoint
    const jointAccessCode = body.jointAccessCode ? String(body.jointAccessCode).trim() : null

    if (!name || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (isJoint && (!jointAccessCode || jointAccessCode.length < 4)) {
      return NextResponse.json(
        {
          error: 'Veuillez définir un code d’accès commun (4 caractères minimum)',
        },
        { status: 400 },
      )
    }

    const trimmedName = String(name).trim()
    const normalizedBank = bank !== undefined && bank !== null ? String(bank).trim() : null

    const duplicate = await prisma.account.findFirst({
      where: {
        ownerId: userId,
        name: trimmedName,
        bank: normalizedBank,
      },
    })

    if (duplicate) {
      return NextResponse.json(
        {
          error: 'Un compte avec ce nom et cette banque existe déjà',
          details: 'duplicate-account',
        },
        { status: 409 },
      )
    }

    const account = await prisma.account.create({
      data: {
        name: trimmedName,
        bank: normalizedBank || null,
        type,
        balance: typeof balance === 'number' ? balance : parseFloat(balance) || 0,
        ownerId: userId,
        isJoint,
        jointAccessCode: isJoint ? jointAccessCode : null,
      },
    })
    return NextResponse.json(account, { status: 201 })
  } catch (error: any) {
    console.error('Error creating account:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: error?.message || 'Failed to create account', details: error?.code },
      { status },
    )
  }
}
