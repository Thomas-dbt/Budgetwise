import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'

/**
 * POST /api/investments/savings
 * CrÃ©e un investissement Livret avec suivi simple et projections
 * CrÃ©e automatiquement un compte associÃ© pour synchronisation avec les transactions
 * 
 * Body:
 * {
 *   name: string (ex: "Livret A")
 *   bank: string (ex: "CrÃ©dit Mutuel")
 *   currency: string (ex: "EUR")
 *   start_date: string (ISO date)
 *   current_balance: number (ex: 5000.00) - solde actuel
 *   annual_rate_pct?: number (optionnel mais recommandÃ©, ex: 3.0)
 *   monthly_contribution?: number (optionnel - prÃ©vision mensuelle)
 *   ceiling?: number (optionnel - plafond du livret)
 *   interest_mode?: string (optionnel - "simple_annuel" par dÃ©faut)
 *   account_id?: string (optionnel - ID d'un compte existant Ã  lier)
 *   notes?: string (optionnel)
 * }
 */
export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json()

    // Validation des champs obligatoires
    const {
      name,
      bank,
      currency = 'EUR',
      start_date,
      current_balance,
      annual_rate_pct,
      monthly_contribution,
      ceiling,
      interest_mode = 'simple_annuel',
      account_id,
      notes
    } = body

    if (!name || !bank || !start_date || current_balance === undefined || current_balance === null) {
      return NextResponse.json(
        { error: 'Champs obligatoires manquants: name, bank, start_date, current_balance' },
        { status: 400 }
      )
    }

    const currentBalance = Number(current_balance)
    const annualRate = annual_rate_pct ? Number(annual_rate_pct) : null
    const monthlyContribution = monthly_contribution ? Number(monthly_contribution) : null

    // GÃ©rer le compte associÃ©
    let accountId: string | null = null
    let account: any = null
    
    if (account_id) {
      // VÃ©rifier que le compte existe et appartient Ã  l'utilisateur
      const existingAccount = await prisma.account.findFirst({
        where: {
          id: account_id,
          ownerId: userId
        }
      })
      
      if (!existingAccount) {
        return NextResponse.json(
          { error: 'Compte non trouvÃ© ou non autorisÃ©' },
          { status: 404 }
        )
      }
      
      accountId = account_id
      account = existingAccount
      
      // VÃ©rifier qu'il n'y a pas dÃ©jÃ  un investissement liÃ© Ã  ce compte
      // Note: accountId peut ne pas exister si la migration n'a pas été appliquée
      try {
        const existingInvestment = await prisma.investmentAsset.findFirst({
          where: {
            accountId: account_id,
            category: 'Livret'
          }
        })
        
        if (existingInvestment) {
          return NextResponse.json(
            { error: 'Ce compte est dÃ©jÃ  liÃ© Ã  un investissement Livret' },
            { status: 400 }
          )
        }
      } catch (error: any) {
        // Si accountId n'existe pas encore, ignorer cette vérification
        if (!error?.message?.includes('accountId') && !error?.message?.includes('account')) {
          throw error
        }
      }
    } else {
      // CrÃ©er automatiquement un compte pour ce Livret
      const newAccount = await prisma.account.create({
        data: {
          name,
          bank,
          type: 'savings', // Type Ã©pargne
          balance: currentBalance,
          ownerId: userId
        }
      })
      
      accountId = newAccount.id
      account = newAccount
    }

    // Calcul de la projection 1 an (approximation)
    // Projection = solde actuel * (1 + taux) + 12 * contribution mensuelle
    let projection1y = currentBalance
    if (annualRate && annualRate > 0) {
      projection1y = currentBalance * (1 + annualRate / 100)
    }
    if (monthlyContribution) {
      projection1y += monthlyContribution * 12
    }

    // IntÃ©rÃªts estimÃ©s sur 1 an
    const averageBalance = currentBalance + (monthlyContribution ? monthlyContribution * 6 : 0) // Moyenne sur l'annÃ©e
    const estimatedInterest1y = annualRate && annualRate > 0
      ? averageBalance * annualRate / 100
      : 0

    // Utiliser le solde du compte si liÃ©, sinon utiliser currentBalance
    const finalBalance = account ? Number(account.balance) : currentBalance

    // CrÃ©er l'investissement liÃ© au compte
    // Note: accountId peut ne pas exister si la migration n'a pas été appliquée
    const assetData: any = {
      userId,
      name,
      symbol: null,
      category: 'Livret',
      platform: bank,
      currency,
      comment: notes || null,
      valuationMode: 'taux',
      priceProvider: null,
      baseSymbol: null,
      quoteSymbol: currency,
      tradingViewSymbol: null,
      quantity: 1,
      currentPrice: null,
      currentValue: finalBalance, // Utiliser le solde du compte si liÃ©
      amountInvested: currentBalance, // Montant initial investi
      baseAmount: finalBalance, // Montant de base pour calculs de taux
      lastValuationDate: new Date()
    }
    
    // Ajouter accountId seulement si disponible (sera ignoré par Prisma si la colonne n'existe pas)
    if (accountId) {
      assetData.accountId = accountId
    }
    
    const asset = await prisma.investmentAsset.create({
      data: assetData
    })

    // CrÃ©er la position avec les dÃ©tails
    const startDate = new Date(start_date)
    const position = await prisma.position.create({
      data: {
        assetId: asset.id,
        quantity: 1,
        costBasis: currentBalance,
        paidAmount: currentBalance,
        paidCurrency: currency,
        purchaseDate: startDate,
        fxRateToQuote: null
      }
    })

    return NextResponse.json({
      asset: {
        id: asset.id,
        name: asset.name,
        platform: asset.platform,
        currency: asset.currency,
        currentValue: finalBalance,
        accountId: accountId || null
      },
      account: accountId ? {
        id: accountId,
        name: account?.name || name,
        balance: finalBalance
      } : null,
      position: {
        id: position.id,
        quantity: position.quantity.toString(),
        costBasis: position.costBasis.toString()
      },
      projection: {
        currentValue: finalBalance,
        projection1y,
        estimatedInterest1y,
        annualRate: annualRate || null,
        monthlyContribution: monthlyContribution || null,
        ceiling: ceiling ? Number(ceiling) : null,
        interestMode
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('Savings account POST error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: error?.message || 'Impossible de crÃ©er le Livret' },
      { status }
    )
  }
}
