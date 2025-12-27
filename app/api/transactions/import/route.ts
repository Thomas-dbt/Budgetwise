import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'

interface ImportRow {
  date: string
  description?: string
  amount: number
  type: 'income' | 'expense' | 'transfer'
  categoryName?: string
  categoryId?: string
  pending?: boolean
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await request.json()
    const { accountId, rows } = body as { accountId?: string; rows?: ImportRow[] }

    if (!accountId || !rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Données d’import invalides' }, { status: 400 })
    }

    const account = await prisma.account.findUnique({ where: { id: accountId, ownerId: userId } })
    if (!account) {
      return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 })
    }

    const categories = await prisma.category.findMany()
    const categoryMap = new Map(categories.map(cat => [cat.name.toLowerCase(), cat.id]))
    const fallbackCategory = categoryMap.get('autres')
    const abonnementCategoryEntry = [...categoryMap.entries()].find(([name]) => name.includes('abonn'))
    const abonnementCategoryId = abonnementCategoryEntry ? abonnementCategoryEntry[1] : undefined
    const subscriptionKeywords = /(abonn|spotify|netflix|canal|prime video|primevideo|youtube|deezer|disney|molotov|salto|mycanal|itunes|apple music|playstation plus|xbox game pass|basic fit|fitness park|club|box internet|freebox|bbox|livebox)/

    // Import helper
    const { autoCategorize } = await import('@/lib/auto-categorize')

    const transactionsData = (await Promise.all(rows.map(async (row) => {
      const normalizedType = row.type.toLowerCase()
      if (!['income', 'expense', 'transfer'].includes(normalizedType)) {
        return null
      }

      const parsedDate = row.date ? new Date(row.date) : null
      if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
        return null
      }

      let amount = Number(row.amount)
      if (Number.isNaN(amount)) {
        return null
      }

      if (normalizedType === 'expense' && amount > 0) {
        amount = -amount
      }
      if (normalizedType === 'income' && amount < 0) {
        amount = Math.abs(amount)
      }

      // 1. Try provided ID
      let categoryId: string | undefined = row.categoryId

      // 2. Try provided Name
      if (!categoryId && row.categoryName) {
        const key = row.categoryName.trim().toLowerCase()
        if (categoryMap.has(key)) {
          categoryId = categoryMap.get(key)
        }
      }

      // 3. Try Auto-Categorize (User Keywords)
      if (!categoryId && row.description) {
        const match = await autoCategorize(row.description, userId)
        if (match) {
          categoryId = match.id
        }
      }

      // 4. Fallback: Hardcoded Subscriptions
      if (!categoryId && abonnementCategoryId) {
        const descToCheck = (row.description || '') + ' ' + (row.categoryName || '')
        if (subscriptionKeywords.test(descToCheck.toLowerCase())) {
          categoryId = abonnementCategoryId
        }
      }

      // 5. Fallback: "Autres" (only if explicitly requested or legacy behavior? The original code put fallbackCategory if row.categoryName was present but not found. I'll preserve that specific behavior if categoryName was provided but not found.)
      if (!categoryId && row.categoryName && fallbackCategory) {
        // Only if we really didn't find anything and had a name input
        categoryId = fallbackCategory
      }

      return {
        accountId,
        amount,
        type: normalizedType as ImportRow['type'],
        date: parsedDate,
        description: row.description || null,
        pending: !!row.pending,
        categoryId
      }
    }))).filter(Boolean) as Array<{ accountId: string; amount: number; type: string; date: Date; description: string | null; pending: boolean; categoryId?: string }>

    if (transactionsData.length === 0) {
      return NextResponse.json({ error: 'Aucune transaction valide à importer' }, { status: 400 })
    }

    // Fonction pour normaliser une description (supprimer numéros de carte, dates, espaces multiples)
    const normalizeDescription = (desc: string | null): string => {
      if (!desc) return ''
      let normalized = desc.trim().toLowerCase()

      // Supprimer les préfixes communs des relevés bancaires (plusieurs passes pour être sûr)
      normalized = normalized.replace(/^prlv\s+sepa\s+/i, '')
      normalized = normalized.replace(/^virement\s+sepa\s+/i, '')
      normalized = normalized.replace(/^prelevement\s+sepa\s+/i, '')
      normalized = normalized.replace(/^prlv\s+/i, '')
      normalized = normalized.replace(/^virement\s+/i, '')
      normalized = normalized.replace(/^carte\s+\d{2}\/\d{2}\/\d{2,4}\s+/i, '')
      normalized = normalized.replace(/^carte\s+/i, '')

      // Supprimer les numéros de carte (CB*1234, CARTE *1234, etc.)
      normalized = normalized.replace(/cb\*?\d{4,}/gi, '')
      normalized = normalized.replace(/carte\s*\d{2}\/\d{2}\/\d{2,4}\s*/gi, '')
      normalized = normalized.replace(/\*\d{4,}/g, '')

      // Supprimer les dates dans la description (27/11/25, 2025-11-27, etc.)
      normalized = normalized.replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, '')
      normalized = normalized.replace(/\d{4}-\d{2}-\d{2}/g, '')

      // Supprimer les suffixes communs (FRANCE, PARIS, etc.) - plusieurs passes
      normalized = normalized.replace(/\s+france\s*$/i, '')
      normalized = normalized.replace(/\s+paris\s*$/i, '')
      normalized = normalized.replace(/\s+lyon\s*$/i, '')
      normalized = normalized.replace(/\s+marseille\s*$/i, '')
      normalized = normalized.replace(/\s+toulouse\s*$/i, '')
      normalized = normalized.replace(/\s+nice\s*$/i, '')
      normalized = normalized.replace(/\s+nantes\s*$/i, '')
      normalized = normalized.replace(/\s+strasbourg\s*$/i, '')
      normalized = normalized.replace(/\s+montpellier\s*$/i, '')
      normalized = normalized.replace(/\s+bordeaux\s*$/i, '')
      normalized = normalized.replace(/\s+saint\s*$/i, '')
      normalized = normalized.replace(/\s+st\.?\s*$/i, '')

      // Supprimer les espaces multiples et caractères spéciaux répétés
      normalized = normalized.replace(/\s+/g, ' ')
      normalized = normalized.replace(/[^\w\s]/g, ' ')
      normalized = normalized.replace(/\s+/g, ' ')

      return normalized.trim()
    }

    // Fonction pour extraire les mots-clés importants (supprimer les mots trop courts ou communs)
    const extractKeywords = (desc: string): string[] => {
      const stopWords = new Set(['le', 'la', 'les', 'de', 'du', 'des', 'et', 'ou', 'un', 'une', 'pour', 'avec', 'sur', 'dans', 'par', 'sepa', 'prlv', 'carte', 'france'])
      const words = desc.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w))
      return words
    }

    // Fonction pour calculer la similarité entre deux descriptions
    const calculateSimilarity = (desc1: string, desc2: string): number => {
      const normalized1 = normalizeDescription(desc1)
      const normalized2 = normalizeDescription(desc2)

      // Si les descriptions normalisées sont identiques, similarité = 1
      if (normalized1 === normalized2) return 1.0

      // Si une description est vide après normalisation, comparer les originelles
      if (!normalized1 || !normalized2) {
        const orig1 = (desc1 || '').toLowerCase()
        const orig2 = (desc2 || '').toLowerCase()
        const longer = orig1.length > orig2.length ? orig1 : orig2
        const shorter = orig1.length > orig2.length ? orig2 : orig1
        if (longer.includes(shorter) && shorter.length > 3) {
          return shorter.length / longer.length
        }
        return 0
      }

      // Vérifier si une description contient l'autre (cas "Basic fit" dans "PRLV SEPA BASIC FIT FRANCE")
      if (normalized1.includes(normalized2) && normalized2.length > 3) {
        return 0.9 // Très forte similarité
      }
      if (normalized2.includes(normalized1) && normalized1.length > 3) {
        return 0.9 // Très forte similarité
      }

      // Comparer les mots-clés
      const keywords1 = extractKeywords(normalized1)
      const keywords2 = extractKeywords(normalized2)

      if (keywords1.length === 0 || keywords2.length === 0) {
        // Si pas de mots-clés, comparer les sous-chaînes communes
        const longer = normalized1.length > normalized2.length ? normalized1 : normalized2
        const shorter = normalized1.length > normalized2.length ? normalized2 : normalized1

        if (longer.includes(shorter) && shorter.length > 3) {
          return Math.max(0.7, shorter.length / longer.length)
        }
        return 0
      }

      // Calculer le ratio de mots-clés communs
      const commonKeywords = keywords1.filter(k => keywords2.includes(k))
      const totalKeywords = Math.max(keywords1.length, keywords2.length)

      if (totalKeywords === 0) return 0

      let similarity = commonKeywords.length / totalKeywords

      // Si tous les mots-clés de la description courte sont dans la longue, c'est très probablement un doublon
      const shorterKeywords = keywords1.length <= keywords2.length ? keywords1 : keywords2
      const longerKeywords = keywords1.length > keywords2.length ? keywords1 : keywords2
      if (shorterKeywords.length > 0 && shorterKeywords.every(k => longerKeywords.includes(k))) {
        similarity = Math.max(0.85, similarity)
      }

      // Bonus si les descriptions commencent de la même manière
      if (normalized1.slice(0, 8) === normalized2.slice(0, 8) && normalized1.length > 8) {
        similarity = Math.min(1.0, similarity + 0.15)
      }

      return similarity
    }

    // Calculer la plage de dates pour filtrer les transactions existantes
    const dates = transactionsData.map(tx => tx.date.getTime())
    const minDate = new Date(Math.min(...dates))
    const maxDate = new Date(Math.max(...dates))
    // Ajouter une marge de 1 jour avant et après pour être sûr
    minDate.setDate(minDate.getDate() - 1)
    maxDate.setDate(maxDate.getDate() + 1)

    // Récupérer les transactions existantes pour ce compte dans la plage de dates
    const existingTransactions = await prisma.transaction.findMany({
      where: {
        accountId,
        date: {
          gte: minDate,
          lte: maxDate,
        },
      },
      select: {
        amount: true,
        date: true,
        description: true,
      },
    })

    // Filtrer les doublons avec détection de similarité
    const newTransactionsData = transactionsData.filter(tx => {
      const txDate = tx.date.toISOString().split('T')[0] // YYYY-MM-DD
      const txAmount = Number(tx.amount).toFixed(2)

      // Chercher une transaction existante avec la même date et le même montant
      const candidates = existingTransactions.filter(existing => {
        const existingDate = existing.date.toISOString().split('T')[0]
        const existingAmount = Number(existing.amount).toFixed(2)
        return existingDate === txDate && existingAmount === txAmount
      })

      // Si aucune transaction avec même date/montant, ce n'est pas un doublon
      if (candidates.length === 0) return true

      // Vérifier la similarité des descriptions
      const txDesc = tx.description || ''
      for (const candidate of candidates) {
        const similarity = calculateSimilarity(txDesc, candidate.description || '')
        // Si similarité > 0.5, considérer comme doublon (seuil abaissé pour mieux détecter)
        if (similarity > 0.5) {
          console.log(`[DUPLICATE] Transaction "${txDesc}" similaire à "${candidate.description}" (similarité: ${similarity.toFixed(2)})`)
          return false
        }
      }

      return true
    })

    if (newTransactionsData.length === 0) {
      return NextResponse.json({
        imported: 0,
        skipped: transactionsData.length,
        message: 'Toutes les transactions existent déjà. Aucune nouvelle transaction importée.'
      })
    }

    const totalDelta = newTransactionsData.reduce((sum, tx) => sum + Number(tx.amount), 0)

    const result = await prisma.$transaction(async (tx) => {
      const createManyResult = await tx.transaction.createMany({
        data: newTransactionsData.map(({ categoryId, ...rest }) => ({
          ...rest,
          categoryId: categoryId || null
        }))
      })

      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: {
            increment: totalDelta
          }
        }
      })

      return createManyResult
    })

    return NextResponse.json({
      imported: result.count ?? newTransactionsData.length,
      skipped: transactionsData.length - newTransactionsData.length,
      total: transactionsData.length
    })
  } catch (error: any) {
    console.error('Import transactions error', error)
    return NextResponse.json({ error: error?.message || 'Import impossible' }, { status: 500 })
  }
}

