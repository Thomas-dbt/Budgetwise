import { NextResponse } from 'next/server'

/**
 * GET /api/investments/savings/projection
 * Calcule les projections pour un Livret
 * 
 * Query params:
 * - current_balance: number (solde actuel)
 * - annual_rate_pct?: number (taux annuel en %)
 * - monthly_contribution?: number (contribution mensuelle)
 * - interest_mode?: string (mode de calcul, "simple_annuel" par défaut)
 * 
 * Returns:
 * {
 *   currentValue: number
 *   projection1y: number
 *   estimatedInterest1y: number
 * }
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    
    const currentBalance = Number(searchParams.get('current_balance')) || 0
    const annualRate = searchParams.get('annual_rate_pct') ? Number(searchParams.get('annual_rate_pct')) : null
    const monthlyContribution = searchParams.get('monthly_contribution') ? Number(searchParams.get('monthly_contribution')) : null
    const interestMode = searchParams.get('interest_mode') || 'simple_annuel'

    if (currentBalance <= 0) {
      return NextResponse.json(
        { error: 'current_balance doit être supérieur à 0' },
        { status: 400 }
      )
    }

    // Valeur actuelle = solde actuel
    const currentValue = currentBalance

    // Projection 1 an selon le mode de calcul
    let projection1y = currentBalance
    let estimatedInterest1y = 0

    if (interestMode === 'simple_annuel') {
      // Calcul simple : solde actuel * (1 + taux) + 12 * contribution mensuelle
      if (annualRate && annualRate > 0) {
        projection1y = currentBalance * (1 + annualRate / 100)
      }
      if (monthlyContribution) {
        projection1y += monthlyContribution * 12
      }

      // Intérêts estimés sur 1 an (approximation avec moyenne sur l'année)
      const averageBalance = currentBalance + (monthlyContribution ? monthlyContribution * 6 : 0)
      estimatedInterest1y = annualRate && annualRate > 0
        ? averageBalance * annualRate / 100
        : 0
    } else if (interestMode === 'capitalisation_mensuelle') {
      // Capitalisation mensuelle : (1 + taux/12)^12
      if (annualRate && annualRate > 0) {
        const monthlyRate = annualRate / 100 / 12
        projection1y = currentBalance * Math.pow(1 + monthlyRate, 12)
        
        // Ajouter les contributions mensuelles avec capitalisation
        if (monthlyContribution) {
          let contributionValue = 0
          for (let month = 1; month <= 12; month++) {
            contributionValue += monthlyContribution * Math.pow(1 + monthlyRate, 12 - month + 1)
          }
          projection1y += contributionValue
        }

        estimatedInterest1y = projection1y - currentBalance - (monthlyContribution ? monthlyContribution * 12 : 0)
      } else {
        projection1y = currentBalance + (monthlyContribution ? monthlyContribution * 12 : 0)
      }
    } else if (interestMode === 'capitalisation_trimestrielle') {
      // Capitalisation trimestrielle : (1 + taux/4)^4
      if (annualRate && annualRate > 0) {
        const quarterlyRate = annualRate / 100 / 4
        projection1y = currentBalance * Math.pow(1 + quarterlyRate, 4)
        
        // Ajouter les contributions mensuelles (approximation trimestrielle)
        if (monthlyContribution) {
          projection1y += monthlyContribution * 12 // Simplification
        }

        estimatedInterest1y = projection1y - currentBalance - (monthlyContribution ? monthlyContribution * 12 : 0)
      } else {
        projection1y = currentBalance + (monthlyContribution ? monthlyContribution * 12 : 0)
      }
    }

    return NextResponse.json({
      currentValue: currentValue,
      projection1y: projection1y,
      estimatedInterest1y: estimatedInterest1y
    })
  } catch (error: any) {
    console.error('Savings projection GET error:', error)
    return NextResponse.json(
      { error: error?.message || 'Impossible de calculer les projections' },
      { status: 500 }
    )
  }
}



/**
 * GET /api/investments/savings/projection
 * Calcule les projections pour un Livret
 * 
 * Query params:
 * - current_balance: number (solde actuel)
 * - annual_rate_pct?: number (taux annuel en %)
 * - monthly_contribution?: number (contribution mensuelle)
 * - interest_mode?: string (mode de calcul, "simple_annuel" par défaut)
 * 
 * Returns:
 * {
 *   currentValue: number
 *   projection1y: number
 *   estimatedInterest1y: number
 * }
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    
    const currentBalance = Number(searchParams.get('current_balance')) || 0
    const annualRate = searchParams.get('annual_rate_pct') ? Number(searchParams.get('annual_rate_pct')) : null
    const monthlyContribution = searchParams.get('monthly_contribution') ? Number(searchParams.get('monthly_contribution')) : null
    const interestMode = searchParams.get('interest_mode') || 'simple_annuel'

    if (currentBalance <= 0) {
      return NextResponse.json(
        { error: 'current_balance doit être supérieur à 0' },
        { status: 400 }
      )
    }

    // Valeur actuelle = solde actuel
    const currentValue = currentBalance

    // Projection 1 an selon le mode de calcul
    let projection1y = currentBalance
    let estimatedInterest1y = 0

    if (interestMode === 'simple_annuel') {
      // Calcul simple : solde actuel * (1 + taux) + 12 * contribution mensuelle
      if (annualRate && annualRate > 0) {
        projection1y = currentBalance * (1 + annualRate / 100)
      }
      if (monthlyContribution) {
        projection1y += monthlyContribution * 12
      }

      // Intérêts estimés sur 1 an (approximation avec moyenne sur l'année)
      const averageBalance = currentBalance + (monthlyContribution ? monthlyContribution * 6 : 0)
      estimatedInterest1y = annualRate && annualRate > 0
        ? averageBalance * annualRate / 100
        : 0
    } else if (interestMode === 'capitalisation_mensuelle') {
      // Capitalisation mensuelle : (1 + taux/12)^12
      if (annualRate && annualRate > 0) {
        const monthlyRate = annualRate / 100 / 12
        projection1y = currentBalance * Math.pow(1 + monthlyRate, 12)
        
        // Ajouter les contributions mensuelles avec capitalisation
        if (monthlyContribution) {
          let contributionValue = 0
          for (let month = 1; month <= 12; month++) {
            contributionValue += monthlyContribution * Math.pow(1 + monthlyRate, 12 - month + 1)
          }
          projection1y += contributionValue
        }

        estimatedInterest1y = projection1y - currentBalance - (monthlyContribution ? monthlyContribution * 12 : 0)
      } else {
        projection1y = currentBalance + (monthlyContribution ? monthlyContribution * 12 : 0)
      }
    } else if (interestMode === 'capitalisation_trimestrielle') {
      // Capitalisation trimestrielle : (1 + taux/4)^4
      if (annualRate && annualRate > 0) {
        const quarterlyRate = annualRate / 100 / 4
        projection1y = currentBalance * Math.pow(1 + quarterlyRate, 4)
        
        // Ajouter les contributions mensuelles (approximation trimestrielle)
        if (monthlyContribution) {
          projection1y += monthlyContribution * 12 // Simplification
        }

        estimatedInterest1y = projection1y - currentBalance - (monthlyContribution ? monthlyContribution * 12 : 0)
      } else {
        projection1y = currentBalance + (monthlyContribution ? monthlyContribution * 12 : 0)
      }
    }

    return NextResponse.json({
      currentValue: currentValue,
      projection1y: projection1y,
      estimatedInterest1y: estimatedInterest1y
    })
  } catch (error: any) {
    console.error('Savings projection GET error:', error)
    return NextResponse.json(
      { error: error?.message || 'Impossible de calculer les projections' },
      { status: 500 }
    )
  }
}








