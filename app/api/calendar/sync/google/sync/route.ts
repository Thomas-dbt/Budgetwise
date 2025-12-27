import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/server-auth'
import { syncAllEventsToGoogle } from '@/lib/calendar-sync'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json()
    const { calendarSyncId } = body

    if (!calendarSyncId) {
      return NextResponse.json({ error: 'Missing calendarSyncId' }, { status: 400 })
    }

    // Vérifier que la synchronisation appartient à l'utilisateur
    const sync = await prisma.calendarSync.findUnique({
      where: { id: calendarSyncId, userId }
    })

    if (!sync) {
      return NextResponse.json({ error: 'Calendar sync not found' }, { status: 404 })
    }

    if (!sync.syncEnabled) {
      return NextResponse.json({ error: 'Sync is disabled' }, { status: 400 })
    }

    // Synchroniser tous les événements
    await syncAllEventsToGoogle(userId, calendarSyncId)

    return NextResponse.json({ success: true, message: 'Synchronization completed' })
  } catch (error: any) {
    console.error('Google Calendar sync error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: error?.message || 'Failed to sync calendar' },
      { status }
    )
  }
}





import { getCurrentUserId } from '@/lib/server-auth'
import { syncAllEventsToGoogle } from '@/lib/calendar-sync'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json()
    const { calendarSyncId } = body

    if (!calendarSyncId) {
      return NextResponse.json({ error: 'Missing calendarSyncId' }, { status: 400 })
    }

    // Vérifier que la synchronisation appartient à l'utilisateur
    const sync = await prisma.calendarSync.findUnique({
      where: { id: calendarSyncId, userId }
    })

    if (!sync) {
      return NextResponse.json({ error: 'Calendar sync not found' }, { status: 404 })
    }

    if (!sync.syncEnabled) {
      return NextResponse.json({ error: 'Sync is disabled' }, { status: 400 })
    }

    // Synchroniser tous les événements
    await syncAllEventsToGoogle(userId, calendarSyncId)

    return NextResponse.json({ success: true, message: 'Synchronization completed' })
  } catch (error: any) {
    console.error('Google Calendar sync error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: error?.message || 'Failed to sync calendar' },
      { status }
    )
  }
}











