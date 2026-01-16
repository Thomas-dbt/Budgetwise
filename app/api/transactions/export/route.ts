import { NextResponse } from 'next/server'
import { jsPDF } from 'jspdf'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'
import ExcelJS from 'exceljs'

const formatCurrency = (value: number) => {
  // Formater avec des espaces comme séparateurs de milliers
  const parts = value.toFixed(2).split('.')
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${integerPart},${parts[1]} €`
}

const formatDate = (value: Date) =>
  new Intl.DateTimeFormat('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(value)

export async function GET(req: Request) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'route.ts:13', message: 'GET export called', data: { url: req.url }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
  // #endregion
  try {
    const userId = await getCurrentUserId()
    const { searchParams } = new URL(req.url)

    const format = (searchParams.get('format') || 'xlsx').toLowerCase()
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'route.ts:19', message: 'Format determined', data: { format, userId }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion
    if (!['pdf', 'xlsx'].includes(format)) {
      return NextResponse.json({ error: 'Format non supporté' }, { status: 400 })
    }

    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const accountId = searchParams.get('accountId') || undefined

    let startDate: Date | undefined
    let endDate: Date | undefined

    if (start) {
      const parsed = new Date(start)
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: 'Date de début invalide' }, { status: 400 })
      }
      startDate = parsed
    }

    if (end) {
      const parsed = new Date(end)
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: 'Date de fin invalide' }, { status: 400 })
      }
      parsed.setHours(23, 59, 59, 999)
      endDate = parsed
    }

    if (startDate && endDate && startDate > endDate) {
      return NextResponse.json({ error: 'La date de début doit précéder la date de fin.' }, { status: 400 })
    }

    const where: any = {
      account: { ownerId: userId }
    }

    if (accountId) {
      where.accountId = accountId
    }

    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = startDate
      if (endDate) where.date.lte = endDate
    }

    const accountLabel = accountId
      ? await prisma.account.findFirst({ where: { id: accountId, ownerId: userId }, select: { name: true } })
      : null

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        account: true,
        category: true
      },
      orderBy: { date: 'desc' }
    })
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'route.ts:76', message: 'Transactions fetched', data: { count: transactions.length, format }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' }) }).catch(() => { });
    // #endregion

    if (format === 'csv') {
      const header = ['Date', 'Compte', 'Description', 'Catégorie', 'Type', 'Montant (€)']
      const rows = transactions.map(tx => [
        formatDate(new Date(tx.date)),
        tx.account.name,
        tx.description || '',
        tx.category?.name || 'Sans catégorie',
        tx.type === 'income' ? 'Revenus' : tx.type === 'expense' ? 'Dépenses' : 'Transfert',
        formatCurrency(Number(tx.amount))
      ])

      const csvLines = [header, ...rows].map(columns =>
        columns
          .map(column => {
            const value = String(column ?? '')
            const escaped = value.replace(/"/g, '""')
            return `"${escaped}"`
          })
          .join(';')
      )

      const csvContent = '\uFEFF' + csvLines.join('\n')
      const filename = `budgetwise-export-${new Date().toISOString().slice(0, 10)}.csv`

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      })
    }

    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'BudgetWise'
      workbook.created = new Date()

      const monthlyGroups = transactions.reduce<Record<string, typeof transactions>>((acc, tx) => {
        const date = new Date(tx.date)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        if (!acc[key]) {
          acc[key] = []
        }
        acc[key].push(tx)
        return acc
      }, {})

      const monthEntries = Object.entries(monthlyGroups).sort((a, b) => (a[0] < b[0] ? 1 : -1))

      if (monthEntries.length === 0) {
        monthEntries.push(['Toutes périodes', []])
      }

      monthEntries.forEach(([monthKey, rows]) => {
        const worksheet = workbook.addWorksheet(monthKey)
        worksheet.columns = [
          { header: 'Date', key: 'date', width: 12 },
          { header: 'Compte', key: 'account', width: 20 },
          { header: 'Description', key: 'description', width: 40 },
          { header: 'Catégorie', key: 'category', width: 20 },
          { header: 'Type', key: 'type', width: 15 },
          { header: 'Montant (€)', key: 'amount', width: 16 },
        ]

        const orderedRows = rows.length > 0
          ? [...rows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          : []

        if (orderedRows.length === 0) {
          worksheet.addRow(['Aucune transaction sur cette période'])
          return
        }

        orderedRows.forEach((tx) => {
          const row = worksheet.addRow({
            date: formatDate(new Date(tx.date)),
            account: tx.account.name,
            description: tx.description || 'Sans libellé',
            category: tx.category?.name || 'Sans catégorie',
            type: tx.type === 'income' ? 'Revenus' : tx.type === 'expense' ? 'Dépenses' : 'Transfert',
            amount: Number(tx.amount),
          })
          row.getCell('amount').numFmt = '#,##0.00 "€"'
        })
        const lastDataRow = worksheet.rowCount
        worksheet.addRow([])
        const totalRow = worksheet.addRow({ description: 'Total', amount: { formula: `SUM(F2:F${lastDataRow})` } })
        totalRow.font = { bold: true }
        totalRow.getCell('amount').numFmt = '#,##0.00 "€"'
      })

      const buffer = await workbook.xlsx.writeBuffer()
      const filename = `budgetwise-export-${new Date().toISOString().slice(0, 10)}.xlsx`

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      })
    }

    // PDF export
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'route.ts:189', message: 'Starting PDF generation with jsPDF', data: { transactionCount: transactions.length }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'post-fix', hypothesisId: 'B' }) }).catch(() => { });
    // #endregion

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm' })

    // En-tête
    doc.setFontSize(20)
    doc.text('Export BudgetWise', 105, 20, { align: 'center' })

    let yPos = 35

    if (accountLabel) {
      doc.setFontSize(14)
      doc.text(`Compte: ${accountLabel.name}`, 20, yPos)
      yPos += 10
    }

    if (startDate || endDate) {
      const periodText = startDate && endDate
        ? `Du ${formatDate(startDate)} au ${formatDate(endDate)}`
        : startDate
          ? `À partir du ${formatDate(startDate)}`
          : `Jusqu'au ${formatDate(endDate!)}`
      doc.setFontSize(12)
      doc.text(periodText, 20, yPos)
      yPos += 10
    }

    // Tableau
    doc.setFontSize(10)
    const startX = 20
    const colWidths = [25, 30, 60, 30, 20, 25] // mm
    const headerY = yPos + 5

    // Headers
    doc.setFont('helvetica', 'bold')
    doc.text('Date', startX, headerY)
    doc.text('Compte', startX + colWidths[0], headerY)
    doc.text('Description', startX + colWidths[0] + colWidths[1], headerY)
    doc.text('Catégorie', startX + colWidths[0] + colWidths[1] + colWidths[2], headerY)
    doc.text('Type', startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], headerY)
    doc.text('Montant', startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], headerY)

    // Ligne de séparation
    doc.setLineWidth(0.5)
    doc.line(startX, headerY + 3, startX + colWidths.reduce((a, b) => a + b, 0), headerY + 3)

    yPos = headerY + 8
    doc.setFont('helvetica', 'normal')

    // Grouper les transactions par mois
    const transactionsByMonth = transactions.reduce<Record<string, typeof transactions>>((acc, tx) => {
      const date = new Date(tx.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!acc[monthKey]) {
        acc[monthKey] = []
      }
      acc[monthKey].push(tx)
      return acc
    }, {})

    const monthEntries = Object.entries(transactionsByMonth).sort((a, b) => (a[0] < b[0] ? 1 : -1))

    monthEntries.forEach(([monthKey, monthTransactions], monthIndex) => {
      // Ajouter un séparateur avant chaque mois (sauf le premier)
      if (monthIndex > 0) {
        // Nouvelle page si nécessaire
        if (yPos > 260) {
          doc.addPage()
          yPos = 20
        } else {
          yPos += 5
        }

        // Ligne de séparation entre les mois
        doc.setLineWidth(0.3)
        doc.setDrawColor(200, 200, 200)
        doc.line(startX, yPos, startX + colWidths.reduce((a, b) => a + b, 0), yPos)
        yPos += 5
      }

      // En-tête du mois
      const [year, month] = monthKey.split('-')
      const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
      const monthName = monthNames[parseInt(month) - 1]

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text(`${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`, startX, yPos)
      yPos += 8

      // Transactions du mois
      doc.setFont('helvetica', 'normal')
      monthTransactions.forEach((tx) => {
        // Nouvelle page si nécessaire
        if (yPos > 270) {
          doc.addPage()
          yPos = 20
        }

        doc.setFontSize(9)
        doc.text(formatDate(new Date(tx.date)), startX, yPos)
        doc.text(tx.account.name.substring(0, 15), startX + colWidths[0], yPos)
        doc.text((tx.description || 'Sans libellé').substring(0, 25), startX + colWidths[0] + colWidths[1], yPos)
        doc.text((tx.category?.name || 'Sans catégorie').substring(0, 15), startX + colWidths[0] + colWidths[1] + colWidths[2], yPos)
        doc.text(tx.type === 'income' ? 'Revenus' : tx.type === 'expense' ? 'Dépenses' : 'Transfert', startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], yPos)
        doc.text(formatCurrency(Number(tx.amount)), startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], yPos)

        yPos += 7
      })
    })

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'route.ts:240', message: 'PDF generation completed', data: { pages: doc.getNumberOfPages() }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'post-fix', hypothesisId: 'B' }) }).catch(() => { });
    // #endregion

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    const filename = `budgetwise-export-${new Date().toISOString().slice(0, 10)}.pdf`

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'route.ts:244', message: 'Returning PDF response', data: { filename, bufferSize: pdfBuffer.length }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'post-fix', hypothesisId: 'D' }) }).catch(() => { });
    // #endregion

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'route.ts:262', message: 'Export error caught', data: { error: error?.message, stack: error?.stack, name: error?.name }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
    // #endregion
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'export' }, { status: 500 })
  }
}
