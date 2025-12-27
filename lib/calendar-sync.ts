import { CalendarEvent } from '@prisma/client'
import { createGoogleCalendarEvent, updateGoogleCalendarEvent, deleteGoogleCalendarEvent, getAuthenticatedClient } from './google-calendar'
import { prisma } from './prisma'

export interface SyncEvent {
  id: string
  title: string
  amount: number
  dueDate: Date
  type: 'debit' | 'credit'
  recurring?: string | null
  confirmed: boolean
  categoryId?: string | null
  subCategoryId?: string | null
  accountId?: string | null
}

/**
 * Convertit un événement BudgetWise en format Google Calendar
 */
export function budgetWiseToGoogleEvent(event: SyncEvent): {
  title: string
  description?: string
  start: { dateTime: string; timeZone: string } | { date: string }
  end: { dateTime: string; timeZone: string } | { date: string }
  recurrence?: string[]
} {
  const startDate = new Date(event.dueDate)
  const endDate = new Date(event.dueDate)
  endDate.setHours(endDate.getHours() + 1) // Durée par défaut de 1 heure

  const title = `${event.title} - ${formatCurrency(event.amount)}`
  const description = [
    `Type: ${event.type === 'debit' ? 'Débit' : 'Crédit'}`,
    event.confirmed ? 'Statut: Confirmé' : 'Statut: En attente'
  ].join('\n')

  const start = {
    dateTime: startDate.toISOString(),
    timeZone: 'Europe/Paris'
  }

  const end = {
    dateTime: endDate.toISOString(),
    timeZone: 'Europe/Paris'
  }

  const recurrence: string[] = []
  if (event.recurring === 'monthly') {
    recurrence.push('RRULE:FREQ=MONTHLY')
  } else if (event.recurring === 'weekly') {
    recurrence.push('RRULE:FREQ=WEEKLY')
  } else if (event.recurring === 'quarterly') {
    recurrence.push('RRULE:FREQ=MONTHLY;INTERVAL=3')
  } else if (event.recurring === 'yearly') {
    recurrence.push('RRULE:FREQ=YEARLY')
  }

  return {
    title,
    description,
    start,
    end,
    recurrence: recurrence.length > 0 ? recurrence : undefined
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}

/**
 * Synchronise un événement BudgetWise vers Google Calendar
 */
export async function syncEventToGoogle(
  userId: string,
  calendarSyncId: string,
  event: SyncEvent,
  externalEventId?: string
): Promise<string> {
  const googleEvent = budgetWiseToGoogleEvent(event)

  if (externalEventId) {
    // Mettre à jour l'événement existant
    const updated = await updateGoogleCalendarEvent(
      userId,
      calendarSyncId,
      externalEventId,
      googleEvent
    )
    return updated.id || externalEventId
  } else {
    // Créer un nouvel événement
    const created = await createGoogleCalendarEvent(
      userId,
      calendarSyncId,
      googleEvent
    )
    return created.id || ''
  }
}

/**
 * Supprime un événement de Google Calendar
 */
export async function deleteEventFromGoogle(
  userId: string,
  calendarSyncId: string,
  externalEventId: string
): Promise<void> {
  await deleteGoogleCalendarEvent(userId, calendarSyncId, externalEventId)
}

/**
 * Met à jour la map des IDs d'événements externes
 */
export async function updateEventIdMap(
  calendarSyncId: string,
  budgetWiseEventId: string,
  externalEventId: string
): Promise<void> {
  const sync = await prisma.calendarSync.findUnique({
    where: { id: calendarSyncId }
  })

  if (!sync) {
    throw new Error('Calendar sync not found')
  }

  const eventIdMap = sync.externalEventIdMap
    ? (JSON.parse(sync.externalEventIdMap) as Record<string, string>)
    : {}

  eventIdMap[budgetWiseEventId] = externalEventId

  await prisma.calendarSync.update({
    where: { id: calendarSyncId },
    data: {
      externalEventIdMap: JSON.stringify(eventIdMap)
    }
  })
}

/**
 * Récupère l'ID externe d'un événement BudgetWise
 */
export async function getExternalEventId(
  calendarSyncId: string,
  budgetWiseEventId: string
): Promise<string | null> {
  const sync = await prisma.calendarSync.findUnique({
    where: { id: calendarSyncId }
  })

  if (!sync || !sync.externalEventIdMap) {
    return null
  }

  const eventIdMap = JSON.parse(sync.externalEventIdMap) as Record<string, string>
  return eventIdMap[budgetWiseEventId] || null
}

/**
 * Résout un conflit entre un événement BudgetWise et un événement externe
 * Stratégie: dernière modification gagne
 */
export function resolveConflict(
  budgetWiseEvent: SyncEvent,
  externalEvent: {
    updated?: Date | string
    [key: string]: any
  }
): 'budgetwise' | 'external' {
  const budgetWiseUpdated = new Date() // On considère que l'événement BudgetWise vient d'être modifié
  const externalUpdated = externalEvent.updated 
    ? new Date(externalEvent.updated)
    : new Date(0)

  // Si l'événement externe est plus récent, on garde celui-ci
  if (externalUpdated > budgetWiseUpdated) {
    return 'external'
  }

  // Sinon, on garde l'événement BudgetWise (par défaut)
  return 'budgetwise'
}

/**
 * Synchronise tous les événements BudgetWise vers Google Calendar
 */
export async function syncAllEventsToGoogle(
  userId: string,
  calendarSyncId: string
): Promise<void> {
  const events = await prisma.calendarEvent.findMany({
    where: { userId }
  })

  const sync = await prisma.calendarSync.findUnique({
    where: { id: calendarSyncId }
  })

  if (!sync) {
    throw new Error('Calendar sync not found')
  }

  const eventIdMap = sync.externalEventIdMap
    ? (JSON.parse(sync.externalEventIdMap) as Record<string, string>)
    : {}

  for (const event of events) {
    try {
      const externalEventId = eventIdMap[event.id]
      const syncEvent: SyncEvent = {
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

      const newExternalId = await syncEventToGoogle(
        userId,
        calendarSyncId,
        syncEvent,
        externalEventId
      )

      if (newExternalId && newExternalId !== externalEventId) {
        eventIdMap[event.id] = newExternalId
      }
    } catch (error) {
      console.error(`Failed to sync event ${event.id}:`, error)
    }
  }

  // Mettre à jour la map
  await prisma.calendarSync.update({
    where: { id: calendarSyncId },
    data: {
      externalEventIdMap: JSON.stringify(eventIdMap),
      lastSyncAt: new Date()
    }
  })
}


import { prisma } from './prisma'

export interface SyncEvent {
  id: string
  title: string
  amount: number
  dueDate: Date
  type: 'debit' | 'credit'
  recurring?: string | null
  confirmed: boolean
  categoryId?: string | null
  subCategoryId?: string | null
  accountId?: string | null
}

/**
 * Convertit un événement BudgetWise en format Google Calendar
 */
export function budgetWiseToGoogleEvent(event: SyncEvent): {
  title: string
  description?: string
  start: { dateTime: string; timeZone: string } | { date: string }
  end: { dateTime: string; timeZone: string } | { date: string }
  recurrence?: string[]
} {
  const startDate = new Date(event.dueDate)
  const endDate = new Date(event.dueDate)
  endDate.setHours(endDate.getHours() + 1) // Durée par défaut de 1 heure

  const title = `${event.title} - ${formatCurrency(event.amount)}`
  const description = [
    `Type: ${event.type === 'debit' ? 'Débit' : 'Crédit'}`,
    event.confirmed ? 'Statut: Confirmé' : 'Statut: En attente'
  ].join('\n')

  const start = {
    dateTime: startDate.toISOString(),
    timeZone: 'Europe/Paris'
  }

  const end = {
    dateTime: endDate.toISOString(),
    timeZone: 'Europe/Paris'
  }

  const recurrence: string[] = []
  if (event.recurring === 'monthly') {
    recurrence.push('RRULE:FREQ=MONTHLY')
  } else if (event.recurring === 'weekly') {
    recurrence.push('RRULE:FREQ=WEEKLY')
  } else if (event.recurring === 'quarterly') {
    recurrence.push('RRULE:FREQ=MONTHLY;INTERVAL=3')
  } else if (event.recurring === 'yearly') {
    recurrence.push('RRULE:FREQ=YEARLY')
  }

  return {
    title,
    description,
    start,
    end,
    recurrence: recurrence.length > 0 ? recurrence : undefined
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}

/**
 * Synchronise un événement BudgetWise vers Google Calendar
 */
export async function syncEventToGoogle(
  userId: string,
  calendarSyncId: string,
  event: SyncEvent,
  externalEventId?: string
): Promise<string> {
  const googleEvent = budgetWiseToGoogleEvent(event)

  if (externalEventId) {
    // Mettre à jour l'événement existant
    const updated = await updateGoogleCalendarEvent(
      userId,
      calendarSyncId,
      externalEventId,
      googleEvent
    )
    return updated.id || externalEventId
  } else {
    // Créer un nouvel événement
    const created = await createGoogleCalendarEvent(
      userId,
      calendarSyncId,
      googleEvent
    )
    return created.id || ''
  }
}

/**
 * Supprime un événement de Google Calendar
 */
export async function deleteEventFromGoogle(
  userId: string,
  calendarSyncId: string,
  externalEventId: string
): Promise<void> {
  await deleteGoogleCalendarEvent(userId, calendarSyncId, externalEventId)
}

/**
 * Met à jour la map des IDs d'événements externes
 */
export async function updateEventIdMap(
  calendarSyncId: string,
  budgetWiseEventId: string,
  externalEventId: string
): Promise<void> {
  const sync = await prisma.calendarSync.findUnique({
    where: { id: calendarSyncId }
  })

  if (!sync) {
    throw new Error('Calendar sync not found')
  }

  const eventIdMap = sync.externalEventIdMap
    ? (JSON.parse(sync.externalEventIdMap) as Record<string, string>)
    : {}

  eventIdMap[budgetWiseEventId] = externalEventId

  await prisma.calendarSync.update({
    where: { id: calendarSyncId },
    data: {
      externalEventIdMap: JSON.stringify(eventIdMap)
    }
  })
}

/**
 * Récupère l'ID externe d'un événement BudgetWise
 */
export async function getExternalEventId(
  calendarSyncId: string,
  budgetWiseEventId: string
): Promise<string | null> {
  const sync = await prisma.calendarSync.findUnique({
    where: { id: calendarSyncId }
  })

  if (!sync || !sync.externalEventIdMap) {
    return null
  }

  const eventIdMap = JSON.parse(sync.externalEventIdMap) as Record<string, string>
  return eventIdMap[budgetWiseEventId] || null
}

/**
 * Résout un conflit entre un événement BudgetWise et un événement externe
 * Stratégie: dernière modification gagne
 */
export function resolveConflict(
  budgetWiseEvent: SyncEvent,
  externalEvent: {
    updated?: Date | string
    [key: string]: any
  }
): 'budgetwise' | 'external' {
  const budgetWiseUpdated = new Date() // On considère que l'événement BudgetWise vient d'être modifié
  const externalUpdated = externalEvent.updated 
    ? new Date(externalEvent.updated)
    : new Date(0)

  // Si l'événement externe est plus récent, on garde celui-ci
  if (externalUpdated > budgetWiseUpdated) {
    return 'external'
  }

  // Sinon, on garde l'événement BudgetWise (par défaut)
  return 'budgetwise'
}

/**
 * Synchronise tous les événements BudgetWise vers Google Calendar
 */
export async function syncAllEventsToGoogle(
  userId: string,
  calendarSyncId: string
): Promise<void> {
  const events = await prisma.calendarEvent.findMany({
    where: { userId }
  })

  const sync = await prisma.calendarSync.findUnique({
    where: { id: calendarSyncId }
  })

  if (!sync) {
    throw new Error('Calendar sync not found')
  }

  const eventIdMap = sync.externalEventIdMap
    ? (JSON.parse(sync.externalEventIdMap) as Record<string, string>)
    : {}

  for (const event of events) {
    try {
      const externalEventId = eventIdMap[event.id]
      const syncEvent: SyncEvent = {
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

      const newExternalId = await syncEventToGoogle(
        userId,
        calendarSyncId,
        syncEvent,
        externalEventId
      )

      if (newExternalId && newExternalId !== externalEventId) {
        eventIdMap[event.id] = newExternalId
      }
    } catch (error) {
      console.error(`Failed to sync event ${event.id}:`, error)
    }
  }

  // Mettre à jour la map
  await prisma.calendarSync.update({
    where: { id: calendarSyncId },
    data: {
      externalEventIdMap: JSON.stringify(eventIdMap),
      lastSyncAt: new Date()
    }
  })
}

