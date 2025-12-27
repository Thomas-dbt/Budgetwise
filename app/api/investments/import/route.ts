import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'

/**
 * API pour importer des investissements depuis un fichier CSV (ex: Royaltiz)
 * 
 * Format CSV attendu (exemple Royaltiz):
 * - Colonnes possibles: Nom, Talent, Quantité, Prix unitaire, Valeur totale, Date, etc.
 * - Le parser détecte automatiquement les colonnes disponibles
 */
export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const formData = await req.formData()
    const file = formData.get('file') as File
    const platform = formData.get('platform') as string || 'Royaltiz'

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      return NextResponse.json({ error: 'Le fichier CSV est vide ou invalide' }, { status: 400 })
    }

    // Parser le CSV (détection automatique du délimiteur)
    const delimiter = text.includes(';') ? ';' : ','
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''))
    
    // Normaliser les noms de colonnes (insensible à la casse, accents, espaces)
    const normalizeHeader = (h: string) => h.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()

    const normalizedHeaders = headers.map(normalizeHeader)
    
    // Mapper les colonnes possibles
    const findColumn = (patterns: string[]) => {
      for (const pattern of patterns) {
        const index = normalizedHeaders.findIndex(h => h.includes(pattern))
        if (index !== -1) return index
      }
      return -1
    }

    const nameIndex = findColumn(['nom', 'name', 'talent', 'titre', 'title'])
    const quantityIndex = findColumn(['quantite', 'quantity', 'qte', 'nombre', 'parts'])
    const priceIndex = findColumn(['prix', 'price', 'prix unitaire', 'unitaire', 'cours'])
    const valueIndex = findColumn(['valeur', 'value', 'montant', 'total', 'valeur totale'])
    const dateIndex = findColumn(['date', 'date valorisation', 'date valorisation'])
    const externalIdIndex = findColumn(['id', 'identifiant', 'reference', 'ref'])

    if (nameIndex === -1) {
      return NextResponse.json({ error: 'Colonne "Nom" ou "Talent" introuvable dans le CSV' }, { status: 400 })
    }

    // Générer un ID de batch pour cet import
    const importBatchId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const importDate = new Date()
    const results = {
      created: 0,
      updated: 0,
      errors: [] as string[]
    }

    // Traiter chaque ligne (sauf l'en-tête)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      try {
        // Parser la ligne en tenant compte des guillemets
        const values = parseCsvLine(line, delimiter)
        
        if (values.length < headers.length) {
          // Remplir avec des valeurs vides si nécessaire
          while (values.length < headers.length) {
            values.push('')
          }
        }

        const name = values[nameIndex]?.trim() || `Investissement ${i}`
        const quantity = parseFloat(values[quantityIndex]?.replace(/[^\d.,-]/g, '').replace(',', '.') || '1')
        const price = priceIndex !== -1 ? parseFloat(values[priceIndex]?.replace(/[^\d.,-]/g, '').replace(',', '.') || '0') : null
        const value = valueIndex !== -1 ? parseFloat(values[valueIndex]?.replace(/[^\d.,-]/g, '').replace(',', '.') || '0') : null
        const dateStr = dateIndex !== -1 ? values[dateIndex]?.trim() : null
        const externalId = externalIdIndex !== -1 ? values[externalIdIndex]?.trim() : null

        // Calculer la valeur et le prix
        let currentValue = 0
        let currentPrice = 0

        if (value !== null && !isNaN(value) && value > 0) {
          currentValue = value
          currentPrice = quantity > 0 ? value / quantity : value
        } else if (price !== null && !isNaN(price) && price > 0) {
          currentPrice = price
          currentValue = quantity * price
        } else {
          results.errors.push(`Ligne ${i + 1}: Impossible de déterminer la valeur pour "${name}"`)
          continue
        }

        // Parser la date
        let valuationDate: Date | null = null
        if (dateStr) {
          valuationDate = parseDate(dateStr)
        }
        if (!valuationDate) {
          valuationDate = importDate
        }

        // Chercher un investissement existant (par nom + plateforme ou externalId)
        let existingAsset = null
        if (externalId) {
          existingAsset = await prisma.investmentAsset.findFirst({
            where: {
              userId,
              externalId,
              platform
            }
          })
        }

        if (!existingAsset) {
          existingAsset = await prisma.investmentAsset.findFirst({
            where: {
              userId,
              name,
              platform,
              valuationMode: 'import_externe'
            }
          })
        }

        if (existingAsset) {
          // Mettre à jour l'investissement existant
          await prisma.investmentAsset.update({
            where: { id: existingAsset.id },
            data: {
              quantity: quantity || existingAsset.quantity,
              currentPrice,
              currentValue,
              lastValuationDate: valuationDate,
              importBatchId
            }
          })
          results.updated++
        } else {
          // Créer un nouvel investissement
          await prisma.investmentAsset.create({
            data: {
              userId,
              name,
              symbol: null,
              category: 'Royaltiz',
              platform,
              currency: 'EUR',
              valuationMode: 'import_externe',
              readOnly: true,
              source: 'royaltiz_csv',
              quantity: quantity || 1,
              currentPrice,
              currentValue,
              lastValuationDate: valuationDate,
              externalId: externalId || null,
              importBatchId
            }
          })
          results.created++
        }
      } catch (error: any) {
        results.errors.push(`Ligne ${i + 1}: ${error.message || 'Erreur inconnue'}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import terminé: ${results.created} créés, ${results.updated} mis à jour`,
      results
    })
  } catch (error: any) {
    console.error('Import CSV error:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur lors de l\'import' },
      { status: 500 }
    )
  }
}

/**
 * Parse une ligne CSV en tenant compte des guillemets
 */
function parseCsvLine(line: string, delimiter: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Guillemet échappé
        current += '"'
        i++ // Skip le prochain guillemet
      } else {
        // Toggle inQuotes
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  values.push(current.trim()) // Dernière valeur

  return values
}

/**
 * Parse une date dans différents formats
 */
function parseDate(dateStr: string): Date | null {
  // Formats possibles: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, etc.
  const formats = [
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
    /^(\d{4})-(\d{2})-(\d{2})$/,   // YYYY-MM-DD
    /^(\d{2})-(\d{2})-(\d{4})$/,   // DD-MM-YYYY
  ]

  for (const format of formats) {
    const match = dateStr.match(format)
    if (match) {
      if (format === formats[0]) {
        // DD/MM/YYYY
        return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]))
      } else if (format === formats[1]) {
        // YYYY-MM-DD
        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]))
      } else if (format === formats[2]) {
        // DD-MM-YYYY
        return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]))
      }
    }
  }

  // Essayer de parser directement
  const parsed = new Date(dateStr)
  if (!isNaN(parsed.getTime())) {
    return parsed
  }

  return null
}




