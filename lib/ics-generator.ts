import ical, { ICalCalendar } from 'ical-generator'
import { CalendarEvent, Category, SubCategory } from '@prisma/client'

type CalendarEventWithRelations = CalendarEvent & {
  category?: Category | null
  subCategory?: SubCategory | null
}

export function generateICS(events: CalendarEventWithRelations[]): string {
  const calendar = ical({
    prodId: {
      company: 'BudgetWise',
      product: 'BudgetWise Calendar',
      language: 'FR'
    },
    name: 'BudgetWise - Échéances financières',
    timezone: 'Europe/Paris'
  })

  events.forEach(event => {
    const startDate = new Date(event.dueDate)
    const endDate = new Date(event.dueDate)
    endDate.setHours(endDate.getHours() + 1) // Durée par défaut de 1 heure

    const descriptionParts = [
      `Type: ${event.type === 'debit' ? 'Débit' : 'Crédit'}`,
      `Montant: ${formatCurrency(Number(event.amount))}`,
      event.confirmed ? 'Statut: Confirmé' : 'Statut: En attente'
    ]

    if (event.category) {
      const categoryName = event.category.emoji
        ? `${event.category.emoji} ${event.category.name}`
        : event.category.name
      descriptionParts.push(`Catégorie: ${categoryName}`)
    }

    if (event.subCategory) {
      descriptionParts.push(`Sous-catégorie: ${event.subCategory.name}`)
    }

    const eventObj = calendar.createEvent({
      start: startDate,
      end: endDate,
      summary: `${event.title} - ${formatCurrency(Number(event.amount))}`,
      description: descriptionParts.join('\n'),
      allDay: false,
      timezone: 'Europe/Paris'
    })

    // Ajouter la récurrence si nécessaire
    if (event.recurring === 'monthly') {
      eventObj.repeating({
        freq: 'MONTHLY'
      })
    } else if (event.recurring === 'weekly') {
      eventObj.repeating({
        freq: 'WEEKLY'
      })
    } else if (event.recurring === 'quarterly') {
      eventObj.repeating({
        freq: 'MONTHLY',
        interval: 3
      })
    } else if (event.recurring === 'yearly') {
      eventObj.repeating({
        freq: 'YEARLY'
      })
    }
  })

  return calendar.toString()
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}


