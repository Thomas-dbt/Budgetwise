import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getAuthenticatedClient } from '@/lib/google-calendar'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const headers = req.headers
    const channelId = headers.get('x-goog-channel-id')
    const channelToken = headers.get('x-goog-channel-token')
    const resourceState = headers.get('x-goog-resource-state')

    if (!channelId || !channelToken) {
      return NextResponse.json({ error: 'Missing channel information' }, { status: 400 })
    }

    // Récupérer la synchronisation correspondante au channel token
    const sync = await prisma.calendarSync.findFirst({
      where: {
        provider: 'google',
        // Le channelToken devrait être stocké quelque part pour identifier la sync
        // Pour l'instant, on va chercher toutes les syncs Google et vérifier
      }
    })

    if (!sync) {
      return NextResponse.json({ error: 'Calendar sync not found' }, { status: 404 })
    }

    // Si c'est une notification de synchronisation (sync), récupérer les événements modifiés
    if (resourceState === 'sync' || resourceState === 'exists') {
      // Récupérer les événements modifiés depuis Google Calendar
      const { calendar } = await getAuthenticatedClient(sync.userId, sync.id)
      
      const now = new Date()
      const timeMin = new Date(now.getTime() - 24 * 60 * 60 * 1000) // 24 heures en arrière
      const timeMax = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) // 1 an en avant

      const response = await calendar.events.list({
        calendarId: sync.calendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'updated'
      })

      const events = response.data.items || []
      
      // Mettre à jour les événements correspondants dans BudgetWise
      // Note: Cette logique nécessite de mapper les événements Google vers BudgetWise
      // Pour l'instant, on retourne juste un succès
      
      return NextResponse.json({ 
        success: true, 
        message: 'Webhook received',
        eventsCount: events.length 
      })
    }

    return NextResponse.json({ success: true, message: 'Webhook received' })
  } catch (error: any) {
    console.error('Google Calendar webhook error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to process webhook' },
      { status: 500 }
    )
  }
}





import { google } from 'googleapis'
import { getAuthenticatedClient } from '@/lib/google-calendar'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const headers = req.headers
    const channelId = headers.get('x-goog-channel-id')
    const channelToken = headers.get('x-goog-channel-token')
    const resourceState = headers.get('x-goog-resource-state')

    if (!channelId || !channelToken) {
      return NextResponse.json({ error: 'Missing channel information' }, { status: 400 })
    }

    // Récupérer la synchronisation correspondante au channel token
    const sync = await prisma.calendarSync.findFirst({
      where: {
        provider: 'google',
        // Le channelToken devrait être stocké quelque part pour identifier la sync
        // Pour l'instant, on va chercher toutes les syncs Google et vérifier
      }
    })

    if (!sync) {
      return NextResponse.json({ error: 'Calendar sync not found' }, { status: 404 })
    }

    // Si c'est une notification de synchronisation (sync), récupérer les événements modifiés
    if (resourceState === 'sync' || resourceState === 'exists') {
      // Récupérer les événements modifiés depuis Google Calendar
      const { calendar } = await getAuthenticatedClient(sync.userId, sync.id)
      
      const now = new Date()
      const timeMin = new Date(now.getTime() - 24 * 60 * 60 * 1000) // 24 heures en arrière
      const timeMax = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) // 1 an en avant

      const response = await calendar.events.list({
        calendarId: sync.calendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'updated'
      })

      const events = response.data.items || []
      
      // Mettre à jour les événements correspondants dans BudgetWise
      // Note: Cette logique nécessite de mapper les événements Google vers BudgetWise
      // Pour l'instant, on retourne juste un succès
      
      return NextResponse.json({ 
        success: true, 
        message: 'Webhook received',
        eventsCount: events.length 
      })
    }

    return NextResponse.json({ success: true, message: 'Webhook received' })
  } catch (error: any) {
    console.error('Google Calendar webhook error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to process webhook' },
      { status: 500 }
    )
  }
}











