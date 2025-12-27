import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/server-auth'
import { exchangeCodeForTokens, listGoogleCalendars } from '@/lib/google-calendar'
import { encrypt } from '@/lib/encryption'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code) {
      return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 })
    }

    // Parser l'état pour obtenir userId et calendarId
    let parsedState: { userId: string; calendarId: string } | null = null
    if (state) {
      try {
        parsedState = JSON.parse(state)
      } catch {
        // Ignorer si l'état n'est pas valide
      }
    }

    const calendarId = parsedState?.calendarId || 'primary'

    // Échanger le code contre les tokens
    const { accessToken, refreshToken, expiresAt } = await exchangeCodeForTokens(code)

    // Récupérer les informations du calendrier
    const { google } = await import('googleapis')
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4002/api/calendar/sync/google/callback'
    
    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials are not configured')
    }
    
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
    oauth2Client.setCredentials({ access_token: accessToken })

    const calendar = (await import('googleapis')).google.calendar({ version: 'v3', auth: oauth2Client })
    const calendarList = await calendar.calendarList.list()
    const calendarInfo = calendarList.data.items?.find(cal => cal.id === calendarId) || calendarList.data.items?.[0]

    if (!calendarInfo) {
      throw new Error('Could not retrieve calendar information')
    }

    // Stocker la connexion dans la base de données
    const calendarSync = await prisma.calendarSync.upsert({
      where: {
        userId_provider_calendarId: {
          userId,
          provider: 'google',
          calendarId: calendarInfo.id || calendarId
        }
      },
      update: {
        calendarName: calendarInfo.summary || 'Google Calendar',
        accessToken: encrypt(accessToken),
        refreshToken: refreshToken ? encrypt(refreshToken) : null,
        expiresAt,
        syncEnabled: true
      },
      create: {
        userId,
        provider: 'google',
        calendarId: calendarInfo.id || calendarId,
        calendarName: calendarInfo.summary || 'Google Calendar',
        accessToken: encrypt(accessToken),
        refreshToken: refreshToken ? encrypt(refreshToken) : null,
        expiresAt,
        syncEnabled: true
      }
    })

    // Rediriger vers la page de calendrier avec un message de succès
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4002'}/calendar?sync=success&provider=google`
    )
  } catch (error: any) {
    console.error('Google Calendar callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4002'}/calendar?sync=error&message=${encodeURIComponent(error.message || 'Failed to connect Google Calendar')}`
    )
  }
}


import { exchangeCodeForTokens, listGoogleCalendars } from '@/lib/google-calendar'
import { encrypt } from '@/lib/encryption'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code) {
      return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 })
    }

    // Parser l'état pour obtenir userId et calendarId
    let parsedState: { userId: string; calendarId: string } | null = null
    if (state) {
      try {
        parsedState = JSON.parse(state)
      } catch {
        // Ignorer si l'état n'est pas valide
      }
    }

    const calendarId = parsedState?.calendarId || 'primary'

    // Échanger le code contre les tokens
    const { accessToken, refreshToken, expiresAt } = await exchangeCodeForTokens(code)

    // Récupérer les informations du calendrier
    const { google } = await import('googleapis')
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4002/api/calendar/sync/google/callback'
    
    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials are not configured')
    }
    
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
    oauth2Client.setCredentials({ access_token: accessToken })

    const calendar = (await import('googleapis')).google.calendar({ version: 'v3', auth: oauth2Client })
    const calendarList = await calendar.calendarList.list()
    const calendarInfo = calendarList.data.items?.find(cal => cal.id === calendarId) || calendarList.data.items?.[0]

    if (!calendarInfo) {
      throw new Error('Could not retrieve calendar information')
    }

    // Stocker la connexion dans la base de données
    const calendarSync = await prisma.calendarSync.upsert({
      where: {
        userId_provider_calendarId: {
          userId,
          provider: 'google',
          calendarId: calendarInfo.id || calendarId
        }
      },
      update: {
        calendarName: calendarInfo.summary || 'Google Calendar',
        accessToken: encrypt(accessToken),
        refreshToken: refreshToken ? encrypt(refreshToken) : null,
        expiresAt,
        syncEnabled: true
      },
      create: {
        userId,
        provider: 'google',
        calendarId: calendarInfo.id || calendarId,
        calendarName: calendarInfo.summary || 'Google Calendar',
        accessToken: encrypt(accessToken),
        refreshToken: refreshToken ? encrypt(refreshToken) : null,
        expiresAt,
        syncEnabled: true
      }
    })

    // Rediriger vers la page de calendrier avec un message de succès
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4002'}/calendar?sync=success&provider=google`
    )
  } catch (error: any) {
    console.error('Google Calendar callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4002'}/calendar?sync=error&message=${encodeURIComponent(error.message || 'Failed to connect Google Calendar')}`
    )
  }
}

