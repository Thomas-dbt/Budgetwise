export function generateRecurringOccurrences(
    baseEvent: any,
    startDate: Date,
    endDate: Date,
    exceptions: any[] = []
): any[] {
    if (!baseEvent.recurring) return []

    const occurrences: any[] = []
    const baseDate = new Date(baseEvent.dueDate)
    const baseDay = baseDate.getDate() // Jour du mois (1-31)

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
        // Vérifier si cette date est une exception
        const isException = exceptions.some(ex => {
            const exDate = new Date(ex.date)
            return exDate.getDate() === currentDate.getDate() &&
                exDate.getMonth() === currentDate.getMonth() &&
                exDate.getFullYear() === currentDate.getFullYear()
        })

        if (!isException) {
            occurrences.push({
                ...baseEvent,
                id: `${baseEvent.id}-${currentDate.toISOString()}`,
                dueDate: new Date(currentDate),
                confirmed: false // Le statut confirmé sera déterminé plus tard en vérifiant les transactions
            })
        }

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
