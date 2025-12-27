import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/server-auth'
import { testCalDAVConnection } from '@/lib/caldav-client'
import { encrypt } from '@/lib/encryption'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json()
    const { url, username, password, calendarName } = body

    if (!url || !username || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: url, username, password' },
        { status: 400 }
      )
    }

    // Tester la connexion CalDAV
    const isValid = await testCalDAVConnection({ url, username, password })
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Failed to connect to CalDAV server. Please check your credentials.' },
        { status: 400 }
      )
    }

    // Stocker les credentials (chiffrés)
    // Format: URL dans accessToken, username:password dans refreshToken
    const calendarSync = await prisma.calendarSync.upsert({
      where: {
        userId_provider_calendarId: {
          userId,
          provider: 'apple',
          calendarId: url // Utiliser l'URL comme ID de calendrier
        }
      },
      update: {
        calendarName: calendarName || 'Apple Calendar',
        accessToken: encrypt(url),
        refreshToken: encrypt(`${username}:${password}`),
        syncEnabled: true
      },
      create: {
        userId,
        provider: 'apple',
        calendarId: url,
        calendarName: calendarName || 'Apple Calendar',
        accessToken: encrypt(url),
        refreshToken: encrypt(`${username}:${password}`),
        syncEnabled: true
      }
    })

    return NextResponse.json({
      success: true,
      calendarSync: {
        id: calendarSync.id,
        calendarName: calendarSync.calendarName,
        provider: calendarSync.provider
      }
    })
  } catch (error: any) {
    console.error('Apple Calendar connect error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: error?.message || 'Failed to connect Apple Calendar' },
      { status }
    )
  }
}





import { getCurrentUserId } from '@/lib/server-auth'
import { testCalDAVConnection } from '@/lib/caldav-client'
import { encrypt } from '@/lib/encryption'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json()
    const { url, username, password, calendarName } = body

    if (!url || !username || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: url, username, password' },
        { status: 400 }
      )
    }

    // Tester la connexion CalDAV
    const isValid = await testCalDAVConnection({ url, username, password })
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Failed to connect to CalDAV server. Please check your credentials.' },
        { status: 400 }
      )
    }

    // Stocker les credentials (chiffrés)
    // Format: URL dans accessToken, username:password dans refreshToken
    const calendarSync = await prisma.calendarSync.upsert({
      where: {
        userId_provider_calendarId: {
          userId,
          provider: 'apple',
          calendarId: url // Utiliser l'URL comme ID de calendrier
        }
      },
      update: {
        calendarName: calendarName || 'Apple Calendar',
        accessToken: encrypt(url),
        refreshToken: encrypt(`${username}:${password}`),
        syncEnabled: true
      },
      create: {
        userId,
        provider: 'apple',
        calendarId: url,
        calendarName: calendarName || 'Apple Calendar',
        accessToken: encrypt(url),
        refreshToken: encrypt(`${username}:${password}`),
        syncEnabled: true
      }
    })

    return NextResponse.json({
      success: true,
      calendarSync: {
        id: calendarSync.id,
        calendarName: calendarSync.calendarName,
        provider: calendarSync.provider
      }
    })
  } catch (error: any) {
    console.error('Apple Calendar connect error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: error?.message || 'Failed to connect Apple Calendar' },
      { status }
    )
  }
}











