import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/server-auth'
import { getCalDAVCredentials, fetchCalDAVEvents, createCalDAVEvent, updateCalDAVEvent } from '@/lib/caldav-client'
import { prisma } from '@/lib/prisma'
import { budgetWiseToGoogleEvent, SyncEvent } from '@/lib/calendar-sync'

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

    if (sync.provider !== 'apple') {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
    }

    // Récupérer les credentials CalDAV
    const credentials = await getCalDAVCredentials(calendarSyncId)

    // Récupérer tous les événements BudgetWise
    const budgetWiseEvents = await prisma.calendarEvent.findMany({
      where: { userId }
    })

    // Récupérer les événements CalDAV existants
    const caldavEvents = await fetchCalDAVEvents(credentials)

    const eventIdMap = sync.externalEventIdMap
      ? (JSON.parse(sync.externalEventIdMap) as Record<string, string>)
      : {}

    // Synchroniser les événements BudgetWise vers CalDAV
    for (const event of budgetWiseEvents) {
      try {
        const syncEvent = {
          id: event.id,
          title: event.title,
          amount: Number(event.amount),
          dueDate: event.dueDate,
          type: event.type as 'debit' | 'credit',
          recurring: event.recurring,
          confirmed: event.confirmed,
          categoryId: event.categoryId,
          subCategoryId: event.subCategoryId,
          accountId: event.accountId
        }

        const googleEvent = budgetWiseToGoogleEvent(syncEvent)
        
        // Convertir en format CalDAV
        const startDate = new Date(googleEvent.start.dateTime || (googleEvent.start as any).date)
        const endDate = new Date(googleEvent.end.dateTime || (googleEvent.end as any).date)
        
        const caldavEvent = {
          uid: eventIdMap[event.id] || `budgetwise-${event.id}`,
          summary: googleEvent.title,
          description: googleEvent.description,
          start: startDate,
          end: endDate,
          rrule: googleEvent.recurrence?.[0]?.replace('RRULE:', '')
        }

        const existingUid = eventIdMap[event.id]
        if (existingUid) {
          await updateCalDAVEvent(credentials, existingUid, caldavEvent)
        } else {
          const newUid = await createCalDAVEvent(credentials, caldavEvent)
          eventIdMap[event.id] = newUid
        }
      } catch (error) {
        console.error(`Failed to sync event ${event.id}:`, error)
      }
    }

    // Mettre à jour la map et la date de dernière synchronisation
    await prisma.calendarSync.update({
      where: { id: calendarSyncId },
      data: {
        externalEventIdMap: JSON.stringify(eventIdMap),
        lastSyncAt: new Date()
      }
    })

    return NextResponse.json({ success: true, message: 'Synchronization completed' })
  } catch (error: any) {
    console.error('Apple Calendar sync error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: error?.message || 'Failed to sync calendar' },
      { status }
    )
  }
}


import { getCalDAVCredentials, fetchCalDAVEvents, createCalDAVEvent, updateCalDAVEvent } from '@/lib/caldav-client'
import { prisma } from '@/lib/prisma'
import { budgetWiseToGoogleEvent, SyncEvent } from '@/lib/calendar-sync'

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

    if (sync.provider !== 'apple') {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
    }

    // Récupérer les credentials CalDAV
    const credentials = await getCalDAVCredentials(calendarSyncId)

    // Récupérer tous les événements BudgetWise
    const budgetWiseEvents = await prisma.calendarEvent.findMany({
      where: { userId }
    })

    // Récupérer les événements CalDAV existants
    const caldavEvents = await fetchCalDAVEvents(credentials)

    const eventIdMap = sync.externalEventIdMap
      ? (JSON.parse(sync.externalEventIdMap) as Record<string, string>)
      : {}

    // Synchroniser les événements BudgetWise vers CalDAV
    for (const event of budgetWiseEvents) {
      try {
        const syncEvent = {
          id: event.id,
          title: event.title,
          amount: Number(event.amount),
          dueDate: event.dueDate,
          type: event.type as 'debit' | 'credit',
          recurring: event.recurring,
          confirmed: event.confirmed,
          categoryId: event.categoryId,
          subCategoryId: event.subCategoryId,
          accountId: event.accountId
        }

        const googleEvent = budgetWiseToGoogleEvent(syncEvent)
        
        // Convertir en format CalDAV
        const startDate = new Date(googleEvent.start.dateTime || (googleEvent.start as any).date)
        const endDate = new Date(googleEvent.end.dateTime || (googleEvent.end as any).date)
        
        const caldavEvent = {
          uid: eventIdMap[event.id] || `budgetwise-${event.id}`,
          summary: googleEvent.title,
          description: googleEvent.description,
          start: startDate,
          end: endDate,
          rrule: googleEvent.recurrence?.[0]?.replace('RRULE:', '')
        }

        const existingUid = eventIdMap[event.id]
        if (existingUid) {
          await updateCalDAVEvent(credentials, existingUid, caldavEvent)
        } else {
          const newUid = await createCalDAVEvent(credentials, caldavEvent)
          eventIdMap[event.id] = newUid
        }
      } catch (error) {
        console.error(`Failed to sync event ${event.id}:`, error)
      }
    }

    // Mettre à jour la map et la date de dernière synchronisation
    await prisma.calendarSync.update({
      where: { id: calendarSyncId },
      data: {
        externalEventIdMap: JSON.stringify(eventIdMap),
        lastSyncAt: new Date()
      }
    })

    return NextResponse.json({ success: true, message: 'Synchronization completed' })
  } catch (error: any) {
    console.error('Apple Calendar sync error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: error?.message || 'Failed to sync calendar' },
      { status }
    )
  }
}

