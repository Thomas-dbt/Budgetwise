import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'

// Fonction pour générer les occurrences récurrentes
function generateRecurringOccurrences(
  baseEvent: any,
  startDate: Date,
  endDate: Date
): any[] {
  if (!baseEvent.recurring) return []

  const occurrences: any[] = []
  const baseDate = new Date(baseEvent.dueDate)
  const baseDay = baseDate.getDate() // Jour du mois (1-31)
  const baseHour = baseDate.getHours()
  const baseMinute = baseDate.getMinutes()

  let currentDate = new Date(baseDate)

  // Avancer jusqu'à la date de début si nécessaire
  while (currentDate < startDate) {
    switch (baseEvent.recurring) {
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + 7)
        break
      case 'monthly':
        // Préserver le jour du mois
        currentDate.setMonth(currentDate.getMonth() + 1)
        // Ajuster si le jour n'existe pas dans le mois (ex: 31 février)
        const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
        currentDate.setDate(Math.min(baseDay, daysInMonth))
        break
      case 'quarterly':
        currentDate.setMonth(currentDate.getMonth() + 3)
        const daysInQuarterMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
        currentDate.setDate(Math.min(baseDay, daysInQuarterMonth))
        break
      case 'yearly':
        currentDate.setFullYear(currentDate.getFullYear() + 1)
        const daysInYearMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
        currentDate.setDate(Math.min(baseDay, daysInYearMonth))
        break
      default:
        return []
    }
  }

  // Générer les occurrences jusqu'à la date de fin
  let maxIterations = 1000 // Sécurité pour éviter les boucles infinies
  while (currentDate <= endDate && maxIterations > 0) {
    occurrences.push({
      ...baseEvent,
      id: `${baseEvent.id}-${currentDate.toISOString()}`,
      dueDate: new Date(currentDate),
      confirmed: false // Le statut confirmé sera déterminé plus tard en vérifiant les transactions
    })

    switch (baseEvent.recurring) {
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + 7)
        break
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + 1)
        const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
        currentDate.setDate(Math.min(baseDay, daysInMonth))
        break
      case 'quarterly':
        currentDate.setMonth(currentDate.getMonth() + 3)
        const daysInQuarterMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
        currentDate.setDate(Math.min(baseDay, daysInQuarterMonth))
        break
      case 'yearly':
        currentDate.setFullYear(currentDate.getFullYear() + 1)
        const daysInYearMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
        currentDate.setDate(Math.min(baseDay, daysInYearMonth))
        break
    }
    maxIterations--
  }

  return occurrences
}

export async function GET(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const { searchParams } = new URL(req.url)

    // Récupérer le mois/année demandé depuis les paramètres (par défaut mois actuel)
    const requestedMonth = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null
    const requestedYear = searchParams.get('year') ? parseInt(searchParams.get('year')!) : null

    const now = new Date()
    const targetMonth = requestedMonth !== null ? requestedMonth : now.getMonth()
    const targetYear = requestedYear !== null ? requestedYear : now.getFullYear()

    // Récupérer tous les événements du calendrier
    const events = await prisma.calendarEvent.findMany({
      where: { userId },
      orderBy: { dueDate: 'asc' },
      include: {
        category: {
          include: { parent: true }
        }
      }
    })

    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Prélèvements à confirmer (non confirmés et date passée ou proche)
    const pendingConfirmations = events.filter(e =>
      !e.confirmed &&
      e.type === 'debit' &&
      new Date(e.dueDate) <= sevenDaysFromNow
    )

    // Prochains prélèvements (7 jours) - inclure les occurrences récurrentes
    const upcomingNext7Days: any[] = []

    // Ajouter les événements non récurrents
    events.forEach(e => {
      if (!e.recurring &&
        e.type === 'debit' &&
        new Date(e.dueDate) > now &&
        new Date(e.dueDate) <= sevenDaysFromNow) {
        upcomingNext7Days.push(e)
      }
    })

    // Ajouter les occurrences récurrentes pour les 7 prochains jours
    events.forEach(e => {
      if (e.recurring) {
        const occurrences = generateRecurringOccurrences(e, now, sevenDaysFromNow)
        occurrences.forEach(occ => {
          if (occ.type === 'debit') {
            upcomingNext7Days.push(occ)
          }
        })
      }
    })

    // Trier par date
    upcomingNext7Days.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

    // Échéances récurrentes actives
    const recurringEvents = events.filter(e => e.recurring)

    // Calculer les dates de début et fin du mois cible
    const monthStart = new Date(targetYear, targetMonth, 1)
    const monthEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999)

    // Événements pour le calendrier mensuel
    const monthEvents: any[] = []

    // Ajouter les événements non récurrents du mois
    events.forEach(e => {
      if (!e.recurring) {
        const eventDate = new Date(e.dueDate)
        if (eventDate.getMonth() === targetMonth &&
          eventDate.getFullYear() === targetYear) {
          monthEvents.push(e)
        }
      }
    })

    // Générer les occurrences récurrentes pour le mois cible
    // Récupérer toutes les transactions pertinentes en une seule requête pour optimiser
    if (recurringEvents.length > 0) {
      const recurringTitles = [...new Set(recurringEvents.map(e => e.title))]
      const recurringAccountIds = [...new Set(recurringEvents.map(e => e.accountId).filter((id): id is string => !!id))]

      // Récupérer les transactions pour les événements récurrents
      // Filtrer par userId via la relation account
      const transactionsWhere: any = {
        account: {
          ownerId: userId
        },
        description: {
          in: recurringTitles
        }
      }
      if (recurringAccountIds.length > 0) {
        transactionsWhere.accountId = {
          in: recurringAccountIds
        }
      }

      const transactions = await prisma.transaction.findMany({
        where: transactionsWhere,
        select: { date: true, description: true, accountId: true }
      })

      // Créer un map pour vérifier rapidement si une transaction existe
      const transactionMap = new Map<string, boolean>()
      transactions.forEach(t => {
        const key = `${t.description || ''}-${t.accountId || ''}-${t.date.toISOString().slice(0, 10)}`
        transactionMap.set(key, true)
      })

      for (const e of recurringEvents) {
        // Générer les occurrences pour une période plus large (3 mois avant et après)
        const extendedStart = new Date(targetYear, targetMonth - 3, 1)
        const extendedEnd = new Date(targetYear, targetMonth + 4, 0, 23, 59, 59, 999)
        const occurrences = generateRecurringOccurrences(e, extendedStart, extendedEnd)

        // Filtrer pour garder seulement celles du mois cible et vérifier si elles sont confirmées
        occurrences.forEach(occ => {
          const occDate = new Date(occ.dueDate)
          if (occDate.getMonth() === targetMonth &&
            occDate.getFullYear() === targetYear) {
            // Vérifier si une transaction existe pour cette occurrence
            const occDateStr = occ.dueDate.toISOString().slice(0, 10)
            const transactionKey = `${e.title}-${e.accountId || ''}-${occDateStr}`
            if (transactionMap.has(transactionKey)) {
              occ.confirmed = true
            }
            monthEvents.push(occ)
          }
        })
      }
    }

    // Trier par date
    monthEvents.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

    return NextResponse.json({
      pendingConfirmations: pendingConfirmations.map(e => serializeCalendarEvent(e)),
      upcomingNext7Days: upcomingNext7Days.map(e => serializeCalendarEvent(e)),
      recurringEvents: recurringEvents.map(e => serializeCalendarEvent(e)),
      monthEvents: monthEvents.map(e => serializeCalendarEvent(e))
    })
  } catch (error: any) {
    console.error('Calendar API error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json({ error: 'Failed to fetch calendar data' }, { status })
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json()
    const { title, type, amount, dueDate, recurring, confirmed, notifyByEmail, emailReminderDaysBefore, toAccountId } = body

    if (!title || !type || amount === undefined || amount === null || !dueDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Vérifier que le compte existe et appartient à l'utilisateur si accountId est fourni
    if (body.accountId) {
      const account = await prisma.account.findUnique({
        where: { id: body.accountId }
      })
      if (!account || account.ownerId !== userId) {
        return NextResponse.json({ error: 'Compte invalide ou non autorisé' }, { status: 400 })
      }
    }

    let finalCategoryId = null
    if (body.subCategoryId) {
      // Assuming it's a valid category ID (child)
      finalCategoryId = body.subCategoryId
    } else if (body.categoryId) {
      finalCategoryId = body.categoryId
    }

    // Verify category exists
    if (finalCategoryId) {
      const cat = await prisma.category.findUnique({ where: { id: finalCategoryId } })
      if (!cat) return NextResponse.json({ error: 'Category not found' }, { status: 400 })
    }

    const event = await prisma.calendarEvent.create({
      data: {
        userId,
        title,
        type,
        amount,
        dueDate: new Date(dueDate),
        recurring: recurring || null,
        confirmed: confirmed || false,
        notifyByEmail: !!notifyByEmail,
        emailReminderDaysBefore: typeof emailReminderDaysBefore === 'number' ? emailReminderDaysBefore : null,
        categoryId: finalCategoryId,
        // subCategoryId removed
        accountId: body.accountId || null,
        toAccountId: body.toAccountId || null
      }
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error: any) {
    console.error('Calendar POST error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    const errorMessage = error?.message || 'Failed to create calendar event'
    return NextResponse.json({ error: errorMessage }, { status })
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing event id' }, { status: 400 })
    }

    const existing = await prisma.calendarEvent.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Événement introuvable' }, { status: 404 })
    }

    let finalCategoryId = undefined
    if (updateData.subCategoryId !== undefined) {
      finalCategoryId = updateData.subCategoryId || null
    } else if (updateData.categoryId !== undefined) {
      finalCategoryId = updateData.categoryId || null
    }
    // Note: if user sends "categoryId" (parent) and it overwrites existing "subCategoryId" (child), it works fine as they are all categories.
    // If user sends subCategoryId: null, loop handles it.

    const event = await prisma.calendarEvent.update({
      where: { id },
      data: {
        ...(updateData.title && { title: updateData.title }),
        ...(updateData.amount !== undefined && { amount: Number(updateData.amount) }),
        ...(updateData.type && { type: updateData.type }),
        ...(updateData.confirmed !== undefined && { confirmed: updateData.confirmed }),
        ...(updateData.dueDate && { dueDate: new Date(updateData.dueDate) }),
        ...(updateData.notifyByEmail !== undefined && { notifyByEmail: !!updateData.notifyByEmail }),
        ...(updateData.emailReminderDaysBefore !== undefined && {
          emailReminderDaysBefore: updateData.emailReminderDaysBefore === null
            ? null
            : Number(updateData.emailReminderDaysBefore)
        }),
        ...(updateData.recurring && { recurring: updateData.recurring }),
        ...(finalCategoryId !== undefined && { categoryId: finalCategoryId }),
        ...(updateData.accountId !== undefined && { accountId: updateData.accountId || null }),
        ...(updateData.toAccountId !== undefined && { toAccountId: updateData.toAccountId || null })
      }
    })

    return NextResponse.json(event)
  } catch (error: any) {
    console.error('Calendar PATCH error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json({ error: 'Failed to update calendar event' }, { status })
  }
}

function serializeCalendarEvent(e: any) {
  try {
    let category = null
    let subCategory = null

    if (e.category) {
      if (e.category.parent) {
        category = {
          id: e.category.parent.id,
          name: e.category.parent.name,
          emoji: e.category.parent.emoji
        }
        subCategory = {
          id: e.category.id,
          name: e.category.name
        }
      } else {
        category = {
          id: e.category.id,
          name: e.category.name,
          emoji: e.category.emoji
        }
      }
    }

    const result = {
      id: e.id,
      title: e.title,
      amount: Number(e.amount),
      dueDate: typeof e.dueDate === 'string' ? e.dueDate : e.dueDate.toISOString(),
      type: e.type,
      recurring: e.recurring,
      confirmed: e.confirmed,
      notifyByEmail: e.notifyByEmail,
      emailReminderDaysBefore: e.emailReminderDaysBefore,
      categoryId: category ? category.id : null,
      subCategoryId: subCategory ? subCategory.id : null,
      accountId: e.accountId,
      toAccountId: e.toAccountId,
      category,
      subCategory
    }
    return result
  } catch (error: any) {
    throw error
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await getCurrentUserId()
    await prisma.calendarEvent.deleteMany({
      where: { userId },
    })
    return NextResponse.json({ reset: true })
  } catch (error: any) {
    console.error('Calendar DELETE error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json({ error: 'Failed to reset calendar' }, { status })
  }
}

