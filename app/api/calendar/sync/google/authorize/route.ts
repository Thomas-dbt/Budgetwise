import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/server-auth'
import { getGoogleAuthUrl } from '@/lib/google-calendar'

export async function GET(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const { searchParams } = new URL(req.url)
    const calendarId = searchParams.get('calendarId') || 'primary'

    // Vérifier que les credentials Google sont configurés
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json(
        { 
          error: 'Google OAuth credentials are not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.',
          details: 'To configure Google Calendar sync, you need to:\n1. Create a project in Google Cloud Console\n2. Enable Google Calendar API\n3. Create OAuth 2.0 credentials\n4. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file'
        },
        { status: 500 }
      )
    }

    // Générer l'URL d'autorisation avec l'état contenant userId et calendarId
    const state = JSON.stringify({ userId, calendarId })
    const authUrl = getGoogleAuthUrl(state)

    return NextResponse.json({ authUrl })
  } catch (error: any) {
    console.error('Google Calendar authorize error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: error?.message || 'Failed to generate authorization URL' },
      { status }
    )
  }
}


import { getGoogleAuthUrl } from '@/lib/google-calendar'

export async function GET(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const { searchParams } = new URL(req.url)
    const calendarId = searchParams.get('calendarId') || 'primary'

    // Vérifier que les credentials Google sont configurés
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json(
        { 
          error: 'Google OAuth credentials are not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.',
          details: 'To configure Google Calendar sync, you need to:\n1. Create a project in Google Cloud Console\n2. Enable Google Calendar API\n3. Create OAuth 2.0 credentials\n4. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file'
        },
        { status: 500 }
      )
    }

    // Générer l'URL d'autorisation avec l'état contenant userId et calendarId
    const state = JSON.stringify({ userId, calendarId })
    const authUrl = getGoogleAuthUrl(state)

    return NextResponse.json({ authUrl })
  } catch (error: any) {
    console.error('Google Calendar authorize error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: error?.message || 'Failed to generate authorization URL' },
      { status }
    )
  }
}

