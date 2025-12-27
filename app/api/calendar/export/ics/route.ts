import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/server-auth'
import { prisma } from '@/lib/prisma'
import { generateICS } from '@/lib/ics-generator'

export async function GET(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = { userId }

    if (startDate || endDate) {
      where.dueDate = {}
      if (startDate) {
        where.dueDate.gte = new Date(startDate)
      }
      if (endDate) {
        where.dueDate.lte = new Date(endDate)
      }
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      include: {
        category: true,
        subCategory: true
      },
      orderBy: { dueDate: 'asc' }
    })

    const icsContent = generateICS(events)

    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="budgetwise-calendar.ics"'
      }
    })
  } catch (error: any) {
    console.error('ICS export error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: error?.message || 'Failed to export calendar' },
      { status }
    )
  }
}


