import { google } from 'googleapis'
import { encrypt, decrypt } from './encryption'
import { prisma } from './prisma'

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4002/api/calendar/sync/google/callback'

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials are not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.')
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

export function getGoogleAuthUrl(state?: string): string {
  const oauth2Client = getOAuth2Client()
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
  ]

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state: state || undefined
  })
}

export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
}> {
  const oauth2Client = getOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  
  return {
    accessToken: tokens.access_token || '',
    refreshToken: tokens.refresh_token || null,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null
  }
}

export async function getAuthenticatedClient(userId: string, calendarSyncId: string) {
  const oauth2Client = getOAuth2Client()
  const sync = await prisma.calendarSync.findUnique({
    where: { id: calendarSyncId, userId }
  })

  if (!sync) {
    throw new Error('Calendar sync not found')
  }

  const accessToken = decrypt(sync.accessToken)
  const refreshToken = sync.refreshToken ? decrypt(sync.refreshToken) : null

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken
  })

  // Rafraîchir le token si nécessaire
  if (sync.expiresAt && sync.expiresAt < new Date()) {
    if (!refreshToken) {
      throw new Error('Token expired and no refresh token available')
    }
    const { credentials } = await oauth2Client.refreshAccessToken()
    
    // Mettre à jour le token dans la base de données
    await prisma.calendarSync.update({
      where: { id: calendarSyncId },
      data: {
        accessToken: encrypt(credentials.access_token || ''),
        refreshToken: credentials.refresh_token ? encrypt(credentials.refresh_token) : sync.refreshToken,
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null
      }
    })

    oauth2Client.setCredentials(credentials)
  }

  return {
    auth: oauth2Client,
    calendar: google.calendar({ version: 'v3', auth: oauth2Client })
  }
}

export async function createGoogleCalendarEvent(
  userId: string,
  calendarSyncId: string,
  event: {
    title: string
    description?: string
    start: { dateTime: string; timeZone?: string } | { date: string }
    end: { dateTime: string; timeZone?: string } | { date: string }
    recurrence?: string[]
  }
) {
  const { calendar } = await getAuthenticatedClient(userId, calendarSyncId)
  const sync = await prisma.calendarSync.findUnique({
    where: { id: calendarSyncId }
  })

  if (!sync) {
    throw new Error('Calendar sync not found')
  }

  const response = await calendar.events.insert({
    calendarId: sync.calendarId,
    requestBody: {
      summary: event.title,
      description: event.description,
      start: event.start,
      end: event.end,
      recurrence: event.recurrence
    }
  })

  return response.data
}

export async function updateGoogleCalendarEvent(
  userId: string,
  calendarSyncId: string,
  eventId: string,
  event: {
    title?: string
    description?: string
    start?: { dateTime: string; timeZone?: string } | { date: string }
    end?: { dateTime: string; timeZone?: string } | { date: string }
    recurrence?: string[]
  }
) {
  const { calendar } = await getAuthenticatedClient(userId, calendarSyncId)
  const sync = await prisma.calendarSync.findUnique({
    where: { id: calendarSyncId }
  })

  if (!sync) {
    throw new Error('Calendar sync not found')
  }

  const response = await calendar.events.update({
    calendarId: sync.calendarId,
    eventId,
    requestBody: {
      summary: event.title,
      description: event.description,
      start: event.start,
      end: event.end,
      recurrence: event.recurrence
    }
  })

  return response.data
}

export async function deleteGoogleCalendarEvent(
  userId: string,
  calendarSyncId: string,
  eventId: string
) {
  const { calendar } = await getAuthenticatedClient(userId, calendarSyncId)
  const sync = await prisma.calendarSync.findUnique({
    where: { id: calendarSyncId }
  })

  if (!sync) {
    throw new Error('Calendar sync not found')
  }

  await calendar.events.delete({
    calendarId: sync.calendarId,
    eventId
  })
}

export async function listGoogleCalendars(userId: string, calendarSyncId: string) {
  const { calendar } = await getAuthenticatedClient(userId, calendarSyncId)
  
  const response = await calendar.calendarList.list()
  return response.data.items || []
}


import { prisma } from './prisma'

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4002/api/calendar/sync/google/callback'

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials are not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.')
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

export function getGoogleAuthUrl(state?: string): string {
  const oauth2Client = getOAuth2Client()
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
  ]

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state: state || undefined
  })
}

export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
}> {
  const oauth2Client = getOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  
  return {
    accessToken: tokens.access_token || '',
    refreshToken: tokens.refresh_token || null,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null
  }
}

export async function getAuthenticatedClient(userId: string, calendarSyncId: string) {
  const oauth2Client = getOAuth2Client()
  const sync = await prisma.calendarSync.findUnique({
    where: { id: calendarSyncId, userId }
  })

  if (!sync) {
    throw new Error('Calendar sync not found')
  }

  const accessToken = decrypt(sync.accessToken)
  const refreshToken = sync.refreshToken ? decrypt(sync.refreshToken) : null

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken
  })

  // Rafraîchir le token si nécessaire
  if (sync.expiresAt && sync.expiresAt < new Date()) {
    if (!refreshToken) {
      throw new Error('Token expired and no refresh token available')
    }
    const { credentials } = await oauth2Client.refreshAccessToken()
    
    // Mettre à jour le token dans la base de données
    await prisma.calendarSync.update({
      where: { id: calendarSyncId },
      data: {
        accessToken: encrypt(credentials.access_token || ''),
        refreshToken: credentials.refresh_token ? encrypt(credentials.refresh_token) : sync.refreshToken,
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null
      }
    })

    oauth2Client.setCredentials(credentials)
  }

  return {
    auth: oauth2Client,
    calendar: google.calendar({ version: 'v3', auth: oauth2Client })
  }
}

export async function createGoogleCalendarEvent(
  userId: string,
  calendarSyncId: string,
  event: {
    title: string
    description?: string
    start: { dateTime: string; timeZone?: string } | { date: string }
    end: { dateTime: string; timeZone?: string } | { date: string }
    recurrence?: string[]
  }
) {
  const { calendar } = await getAuthenticatedClient(userId, calendarSyncId)
  const sync = await prisma.calendarSync.findUnique({
    where: { id: calendarSyncId }
  })

  if (!sync) {
    throw new Error('Calendar sync not found')
  }

  const response = await calendar.events.insert({
    calendarId: sync.calendarId,
    requestBody: {
      summary: event.title,
      description: event.description,
      start: event.start,
      end: event.end,
      recurrence: event.recurrence
    }
  })

  return response.data
}

export async function updateGoogleCalendarEvent(
  userId: string,
  calendarSyncId: string,
  eventId: string,
  event: {
    title?: string
    description?: string
    start?: { dateTime: string; timeZone?: string } | { date: string }
    end?: { dateTime: string; timeZone?: string } | { date: string }
    recurrence?: string[]
  }
) {
  const { calendar } = await getAuthenticatedClient(userId, calendarSyncId)
  const sync = await prisma.calendarSync.findUnique({
    where: { id: calendarSyncId }
  })

  if (!sync) {
    throw new Error('Calendar sync not found')
  }

  const response = await calendar.events.update({
    calendarId: sync.calendarId,
    eventId,
    requestBody: {
      summary: event.title,
      description: event.description,
      start: event.start,
      end: event.end,
      recurrence: event.recurrence
    }
  })

  return response.data
}

export async function deleteGoogleCalendarEvent(
  userId: string,
  calendarSyncId: string,
  eventId: string
) {
  const { calendar } = await getAuthenticatedClient(userId, calendarSyncId)
  const sync = await prisma.calendarSync.findUnique({
    where: { id: calendarSyncId }
  })

  if (!sync) {
    throw new Error('Calendar sync not found')
  }

  await calendar.events.delete({
    calendarId: sync.calendarId,
    eventId
  })
}

export async function listGoogleCalendars(userId: string, calendarSyncId: string) {
  const { calendar } = await getAuthenticatedClient(userId, calendarSyncId)
  
  const response = await calendar.calendarList.list()
  return response.data.items || []
}

