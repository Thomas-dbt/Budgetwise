import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/server-auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const userId = await getCurrentUserId()
    
    const syncs = await prisma.calendarSync.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    // Ne pas retourner les tokens dans la réponse
    const safeSyncs = syncs.map(sync => ({
      id: sync.id,
      provider: sync.provider,
      calendarId: sync.calendarId,
      calendarName: sync.calendarName,
      syncEnabled: sync.syncEnabled,
      lastSyncAt: sync.lastSyncAt,
      createdAt: sync.createdAt,
      updatedAt: sync.updatedAt
    }))

    return NextResponse.json(safeSyncs)
  } catch (error: any) {
    console.error('Calendar syncs GET error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch calendar syncs' },
      { status }
    )
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json()
    const { id, syncEnabled } = body

    if (!id || syncEnabled === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const sync = await prisma.calendarSync.update({
      where: { id, userId },
      data: { syncEnabled }
    })

    return NextResponse.json({
      id: sync.id,
      syncEnabled: sync.syncEnabled
    })
  } catch (error: any) {
    console.error('Calendar sync PATCH error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: error?.message || 'Failed to update calendar sync' },
      { status }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing calendar sync id' }, { status: 400 })
    }

    await prisma.calendarSync.delete({
      where: { id, userId }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Calendar sync DELETE error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: error?.message || 'Failed to delete calendar sync' },
      { status }
    )
  }
}





import { getCurrentUserId } from '@/lib/server-auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const userId = await getCurrentUserId()
    
    const syncs = await prisma.calendarSync.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    // Ne pas retourner les tokens dans la réponse
    const safeSyncs = syncs.map(sync => ({
      id: sync.id,
      provider: sync.provider,
      calendarId: sync.calendarId,
      calendarName: sync.calendarName,
      syncEnabled: sync.syncEnabled,
      lastSyncAt: sync.lastSyncAt,
      createdAt: sync.createdAt,
      updatedAt: sync.updatedAt
    }))

    return NextResponse.json(safeSyncs)
  } catch (error: any) {
    console.error('Calendar syncs GET error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch calendar syncs' },
      { status }
    )
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json()
    const { id, syncEnabled } = body

    if (!id || syncEnabled === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const sync = await prisma.calendarSync.update({
      where: { id, userId },
      data: { syncEnabled }
    })

    return NextResponse.json({
      id: sync.id,
      syncEnabled: sync.syncEnabled
    })
  } catch (error: any) {
    console.error('Calendar sync PATCH error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: error?.message || 'Failed to update calendar sync' },
      { status }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing calendar sync id' }, { status: 400 })
    }

    await prisma.calendarSync.delete({
      where: { id, userId }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Calendar sync DELETE error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: error?.message || 'Failed to delete calendar sync' },
      { status }
    )
  }
}











