import { createDAVClient } from 'dav'
import { encrypt, decrypt } from './encryption'
import { prisma } from './prisma'

export interface CalDAVCredentials {
  url: string
  username: string
  password: string
}

export interface CalDAVEvent {
  uid: string
  summary: string
  description?: string
  start: Date
  end: Date
  rrule?: string
}

/**
 * Crée un client CalDAV avec les credentials fournis
 */
export function createCalDAVClient(credentials: CalDAVCredentials) {
  return createDAVClient(credentials.url, {
    username: credentials.username,
    password: credentials.password
  })
}

/**
 * Teste la connexion CalDAV
 */
export async function testCalDAVConnection(credentials: CalDAVCredentials): Promise<boolean> {
  try {
    const client = createCalDAVClient(credentials)
    await client.calendarQuery({
      calendar: credentials.url,
      filters: {
        'comp-filter': {
          _attributes: { name: 'VCALENDAR' },
          'comp-filter': {
            _attributes: { name: 'VEVENT' }
          }
        }
      }
    })
    return true
  } catch (error) {
    console.error('CalDAV connection test failed:', error)
    return false
  }
}

/**
 * Récupère les événements depuis un calendrier CalDAV
 */
export async function fetchCalDAVEvents(
  credentials: CalDAVCredentials,
  startDate?: Date,
  endDate?: Date
): Promise<CalDAVEvent[]> {
  const client = createCalDAVClient(credentials)
  
  const filters: any = {
    'comp-filter': {
      _attributes: { name: 'VCALENDAR' },
      'comp-filter': {
        _attributes: { name: 'VEVENT' }
      }
    }
  }

  if (startDate || endDate) {
    filters['comp-filter']['comp-filter']['time-range'] = {}
    if (startDate) {
      filters['comp-filter']['comp-filter']['time-range']._attributes = {
        start: startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      }
    }
    if (endDate) {
      if (!filters['comp-filter']['comp-filter']['time-range']._attributes) {
        filters['comp-filter']['comp-filter']['time-range']._attributes = {}
      }
      filters['comp-filter']['comp-filter']['time-range']._attributes.end = 
        endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }
  }

  const response = await client.calendarQuery({
    calendar: credentials.url,
    filters
  })

  // Parser les événements depuis la réponse CalDAV
  const events: CalDAVEvent[] = []
  // Note: Le parsing dépend de la structure de la réponse de la bibliothèque dav
  // Cette implémentation est simplifiée et peut nécessiter des ajustements
  
  return events
}

/**
 * Crée un événement dans un calendrier CalDAV
 */
export async function createCalDAVEvent(
  credentials: CalDAVCredentials,
  event: CalDAVEvent
): Promise<string> {
  const client = createCalDAVClient(credentials)
  
  // Générer le contenu iCal pour l'événement
  const icalContent = generateICalForEvent(event)
  
  const url = `${credentials.url}/${event.uid}.ics`
  
  await client.createCalendarObject({
    calendar: credentials.url,
    filename: `${event.uid}.ics`,
    iCalString: icalContent
  })
  
  return event.uid
}

/**
 * Met à jour un événement dans un calendrier CalDAV
 */
export async function updateCalDAVEvent(
  credentials: CalDAVCredentials,
  eventUid: string,
  event: CalDAVEvent
): Promise<void> {
  const client = createCalDAVClient(credentials)
  
  const icalContent = generateICalForEvent(event)
  
  await client.updateCalendarObject({
    calendar: credentials.url,
    filename: `${eventUid}.ics`,
    iCalString: icalContent
  })
}

/**
 * Supprime un événement d'un calendrier CalDAV
 */
export async function deleteCalDAVEvent(
  credentials: CalDAVCredentials,
  eventUid: string
): Promise<void> {
  const client = createCalDAVClient(credentials)
  
  await client.deleteCalendarObject({
    calendar: credentials.url,
    filename: `${eventUid}.ics`
  })
}

/**
 * Génère le contenu iCal pour un événement
 */
function generateICalForEvent(event: CalDAVEvent): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BudgetWise//Calendar//FR',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTART:${formatICalDate(event.start)}`,
    `DTEND:${formatICalDate(event.end)}`,
    `SUMMARY:${escapeICalText(event.summary)}`,
  ]

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICalText(event.description)}`)
  }

  if (event.rrule) {
    lines.push(`RRULE:${event.rrule}`)
  }

  lines.push('END:VEVENT')
  lines.push('END:VCALENDAR')

  return lines.join('\r\n')
}

function formatICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

/**
 * Récupère les credentials CalDAV depuis la base de données
 */
export async function getCalDAVCredentials(calendarSyncId: string): Promise<CalDAVCredentials> {
  const sync = await prisma.calendarSync.findUnique({
    where: { id: calendarSyncId }
  })

  if (!sync || sync.provider !== 'apple') {
    throw new Error('Calendar sync not found or not an Apple Calendar sync')
  }

  // Les credentials sont stockés dans accessToken (URL) et refreshToken (username:password)
  // Format: URL dans accessToken, username:password dans refreshToken
  const url = decrypt(sync.accessToken)
  const credentials = sync.refreshToken ? decrypt(sync.refreshToken) : ''
  const [username, password] = credentials.split(':')

  if (!username || !password) {
    throw new Error('Invalid CalDAV credentials')
  }

  return {
    url,
    username,
    password
  }
}





import { encrypt, decrypt } from './encryption'
import { prisma } from './prisma'

export interface CalDAVCredentials {
  url: string
  username: string
  password: string
}

export interface CalDAVEvent {
  uid: string
  summary: string
  description?: string
  start: Date
  end: Date
  rrule?: string
}

/**
 * Crée un client CalDAV avec les credentials fournis
 */
export function createCalDAVClient(credentials: CalDAVCredentials) {
  return createDAVClient(credentials.url, {
    username: credentials.username,
    password: credentials.password
  })
}

/**
 * Teste la connexion CalDAV
 */
export async function testCalDAVConnection(credentials: CalDAVCredentials): Promise<boolean> {
  try {
    const client = createCalDAVClient(credentials)
    await client.calendarQuery({
      calendar: credentials.url,
      filters: {
        'comp-filter': {
          _attributes: { name: 'VCALENDAR' },
          'comp-filter': {
            _attributes: { name: 'VEVENT' }
          }
        }
      }
    })
    return true
  } catch (error) {
    console.error('CalDAV connection test failed:', error)
    return false
  }
}

/**
 * Récupère les événements depuis un calendrier CalDAV
 */
export async function fetchCalDAVEvents(
  credentials: CalDAVCredentials,
  startDate?: Date,
  endDate?: Date
): Promise<CalDAVEvent[]> {
  const client = createCalDAVClient(credentials)
  
  const filters: any = {
    'comp-filter': {
      _attributes: { name: 'VCALENDAR' },
      'comp-filter': {
        _attributes: { name: 'VEVENT' }
      }
    }
  }

  if (startDate || endDate) {
    filters['comp-filter']['comp-filter']['time-range'] = {}
    if (startDate) {
      filters['comp-filter']['comp-filter']['time-range']._attributes = {
        start: startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      }
    }
    if (endDate) {
      if (!filters['comp-filter']['comp-filter']['time-range']._attributes) {
        filters['comp-filter']['comp-filter']['time-range']._attributes = {}
      }
      filters['comp-filter']['comp-filter']['time-range']._attributes.end = 
        endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }
  }

  const response = await client.calendarQuery({
    calendar: credentials.url,
    filters
  })

  // Parser les événements depuis la réponse CalDAV
  const events: CalDAVEvent[] = []
  // Note: Le parsing dépend de la structure de la réponse de la bibliothèque dav
  // Cette implémentation est simplifiée et peut nécessiter des ajustements
  
  return events
}

/**
 * Crée un événement dans un calendrier CalDAV
 */
export async function createCalDAVEvent(
  credentials: CalDAVCredentials,
  event: CalDAVEvent
): Promise<string> {
  const client = createCalDAVClient(credentials)
  
  // Générer le contenu iCal pour l'événement
  const icalContent = generateICalForEvent(event)
  
  const url = `${credentials.url}/${event.uid}.ics`
  
  await client.createCalendarObject({
    calendar: credentials.url,
    filename: `${event.uid}.ics`,
    iCalString: icalContent
  })
  
  return event.uid
}

/**
 * Met à jour un événement dans un calendrier CalDAV
 */
export async function updateCalDAVEvent(
  credentials: CalDAVCredentials,
  eventUid: string,
  event: CalDAVEvent
): Promise<void> {
  const client = createCalDAVClient(credentials)
  
  const icalContent = generateICalForEvent(event)
  
  await client.updateCalendarObject({
    calendar: credentials.url,
    filename: `${eventUid}.ics`,
    iCalString: icalContent
  })
}

/**
 * Supprime un événement d'un calendrier CalDAV
 */
export async function deleteCalDAVEvent(
  credentials: CalDAVCredentials,
  eventUid: string
): Promise<void> {
  const client = createCalDAVClient(credentials)
  
  await client.deleteCalendarObject({
    calendar: credentials.url,
    filename: `${eventUid}.ics`
  })
}

/**
 * Génère le contenu iCal pour un événement
 */
function generateICalForEvent(event: CalDAVEvent): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BudgetWise//Calendar//FR',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTART:${formatICalDate(event.start)}`,
    `DTEND:${formatICalDate(event.end)}`,
    `SUMMARY:${escapeICalText(event.summary)}`,
  ]

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICalText(event.description)}`)
  }

  if (event.rrule) {
    lines.push(`RRULE:${event.rrule}`)
  }

  lines.push('END:VEVENT')
  lines.push('END:VCALENDAR')

  return lines.join('\r\n')
}

function formatICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

/**
 * Récupère les credentials CalDAV depuis la base de données
 */
export async function getCalDAVCredentials(calendarSyncId: string): Promise<CalDAVCredentials> {
  const sync = await prisma.calendarSync.findUnique({
    where: { id: calendarSyncId }
  })

  if (!sync || sync.provider !== 'apple') {
    throw new Error('Calendar sync not found or not an Apple Calendar sync')
  }

  // Les credentials sont stockés dans accessToken (URL) et refreshToken (username:password)
  // Format: URL dans accessToken, username:password dans refreshToken
  const url = decrypt(sync.accessToken)
  const credentials = sync.refreshToken ? decrypt(sync.refreshToken) : ''
  const [username, password] = credentials.split(':')

  if (!username || !password) {
    throw new Error('Invalid CalDAV credentials')
  }

  return {
    url,
    username,
    password
  }
}











