import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'
import { calculateRateBasedValue, getMarketSymbol } from '@/lib/investment-valuation'
import { computeRealEstateMetrics } from '@/lib/real-estate-metrics'

interface DashboardParams {
  period?: string // '7d', '30d', '90d', '1y', 'all'
  type?: string // 'all', 'crypto', 'bourse', 'Ã©pargne', 'immobilier', 'autres'
}

// Mapping des catÃ©gories vers les types du dashboard
const categoryToType: Record<string, string> = {
  'Crypto': 'crypto',
  'Action': 'bourse',
  'ETF': 'bourse',
  'Livret': 'Ã©pargne',
  'Fonds euros': 'Ã©pargne',
  'Immobilier': 'immobilier',
  'Crowdfunding': 'autres',
  'Royaltiz': 'autres',
  'Autre': 'autres'
}

export async function GET(req: Request) {
  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/investments/dashboard/route.ts:25',message:'GET: Entry',data:{url:req.url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const userId = await getCurrentUserId()
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/investments/dashboard/route.ts:27',message:'GET: After getCurrentUserId',data:{hasUserId:!!userId,userIdLength:userId?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || '30d'
    const type = searchParams.get('type') || 'all'

    // Calculer la date de dÃ©but selon la pÃ©riode
    const now = new Date()
    let startDate = new Date()
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1)
        break
      case 'all':
        startDate = new Date(0) // Toutes les dates
        break
      default:
        startDate.setDate(now.getDate() - 30)
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/investments/dashboard/route.ts:54',message:'Before fetching assets',data:{userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    // RÃ©cupÃ©rer tous les actifs avec leurs comptes liÃ©s
    // Note: accountId peut ne pas exister si la migration n'a pas été appliquée
    let assets
    try {
      assets = await prisma.investmentAsset.findMany({
        where: { userId },
        include: {
          positions: true,
          account: true // Inclure le compte liÃ© pour les Livrets
        }
      })
    } catch (error: any) {
      // Si accountId n'existe pas encore, réessayer sans inclure account
      if (error?.message?.includes('accountId') || error?.message?.includes('account')) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/investments/dashboard/route.ts:59',message:'accountId column missing, retrying without account include',data:{errorMessage:error?.message?.substring(0,100)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        // Utiliser une requête SQL brute pour éviter que Prisma essaie de lire accountId
        const assetsRaw = await prisma.$queryRaw`
          SELECT * FROM InvestmentAsset WHERE userId = ${userId}
        `
        // Récupérer les positions séparément
        const positions = await prisma.position.findMany({
          where: {
            asset: {
              userId
            }
          }
        })
        // Reconstruire les assets avec leurs positions
        assets = (assetsRaw as any[]).map((asset: any) => ({
          ...asset,
          positions: positions.filter((p: any) => p.assetId === asset.id),
          account: null,
          accountId: null
        }))
      } else {
        throw error
      }
    }
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/investments/dashboard/route.ts:61',message:'After fetching assets',data:{assetsCount:assets.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/investments/dashboard/route.ts:64',message:'Before fetching real estates',data:{hasRealEstateModel:!!prisma.realEstateInvestment},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    // RÃ©cupÃ©rer les investissements immobiliers
    const realEstates = await prisma.realEstateInvestment.findMany({
      where: { userId }
    })
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/investments/dashboard/route.ts:68',message:'After fetching real estates',data:{realEstatesCount:realEstates.length,realEstatesIds:realEstates.map((re:any)=>re.id)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Filtrer par type si nÃ©cessaire
    let filteredAssets = assets
    let filteredRealEstates = realEstates
    if (type !== 'all') {
      filteredAssets = assets.filter(asset => {
        const assetType = categoryToType[asset.category] || 'autres'
        return assetType === type
      })
      if (type === 'immobilier') {
        filteredRealEstates = realEstates
      } else {
        filteredRealEstates = []
      }
    }

    // Calculer les valeurs actuelles
    let totalValue = 0
    let totalCostBasis = 0
    const items: any[] = []

    for (const asset of filteredAssets) {
      const assetAny = asset as any
      const valuationMode = assetAny.valuationMode || 'marchÃ©'
      
      // Calculer quantitÃ© et coÃ»t moyen
      let totalQuantity = Number(assetAny.quantity) || 1
      let totalCost = 0
      
      if (assetAny.positions && assetAny.positions.length > 0) {
        totalQuantity = 0
        for (const position of assetAny.positions) {
          const qty = Number(position.quantity)
          const cost = Number(position.costBasis)
          totalQuantity += qty
          totalCost += qty * cost
        }
      } else if (assetAny.amountInvested) {
        totalCost = Number(assetAny.amountInvested)
      }

      const averageCostBasis = totalQuantity > 0 ? totalCost / totalQuantity : 0

      // Calculer la valeur actuelle
      let currentPrice: number | null = null
      let currentValue = 0

      switch (valuationMode) {
        case 'marchÃ©':
          currentPrice = assetAny.currentPrice ? Number(assetAny.currentPrice) : averageCostBasis
          currentValue = totalQuantity * currentPrice
          break
        case 'taux':
          // Si le Livret est liÃ© Ã  un compte, utiliser le solde du compte
          if (asset.category === 'Livret' && assetAny.accountId && assetAny.account) {
            currentValue = Number(assetAny.account.balance)
            currentPrice = currentValue / (totalQuantity || 1)
          } else if (assetAny.baseAmount && assetAny.annualRate && assetAny.startDate) {
            currentValue = calculateRateBasedValue(
              Number(assetAny.baseAmount),
              Number(assetAny.annualRate),
              assetAny.startDate instanceof Date ? assetAny.startDate : new Date(assetAny.startDate),
              (assetAny.capitalizationMode as any) || 'annuelle'
            )
            currentPrice = currentValue / (totalQuantity || 1)
          } else {
            currentValue = assetAny.baseAmount ? Number(assetAny.baseAmount) : totalCost
            currentPrice = currentValue / (totalQuantity || 1)
          }
          break
        case 'manuel':
          currentPrice = assetAny.manualPrice ? Number(assetAny.manualPrice) : averageCostBasis
          currentValue = totalQuantity * currentPrice
          break
        case 'import_externe':
          currentValue = assetAny.currentValue ? Number(assetAny.currentValue) : totalCost
          currentPrice = totalQuantity > 0 ? currentValue / totalQuantity : 0
          break
        default:
          currentPrice = averageCostBasis
          currentValue = totalQuantity * currentPrice
      }

      const gainLoss = currentValue - totalCost
      const performance = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0

      totalValue += currentValue
      totalCostBasis += totalCost

      // DÃ©terminer le type pour l'affichage
      const assetType = categoryToType[asset.category] || 'autres'
      
      // GÃ©nÃ©rer un sparkline simple (simulation - dans un vrai cas, il faudrait des donnÃ©es historiques)
      const sparkline = generateSparkline(currentValue, performance, 7)

      items.push({
        id: asset.id,
        type: assetType,
        name: asset.name,
        subtitle: asset.symbol || `${totalQuantity.toFixed(4)} unitÃ©s`,
        platform: asset.platform || '-',
        value: currentValue,
        pl_value: gainLoss,
        pl_pct: performance,
        change_24h_pct: 0, // Ã€ calculer avec des donnÃ©es historiques
        sparkline,
        category: asset.category,
        currency: asset.currency
      })
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/investments/dashboard/route.ts:162',message:'Before processing real estates',data:{filteredRealEstatesCount:filteredRealEstates.length,type},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    // Traiter les investissements immobiliers
    for (const realEstate of filteredRealEstates) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/investments/dashboard/route.ts:165',message:'Processing real estate',data:{realEstateId:realEstate.id,realEstateName:realEstate.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const metrics = computeRealEstateMetrics({
        purchasePrice: Number(realEstate.purchasePrice),
        notaryFees: Number(realEstate.notaryFees),
        initialWorks: Number(realEstate.initialWorks),
        downPayment: Number(realEstate.downPayment),
        loanMonthlyPayment: Number(realEstate.loanMonthlyPayment),
        loanInsuranceMonthly: Number(realEstate.loanInsuranceMonthly),
        rentMonthly: Number(realEstate.rentMonthly),
        vacancyRatePct: Number(realEstate.vacancyRatePct),
        nonRecoverableChargesMonthly: Number(realEstate.nonRecoverableChargesMonthly),
        propertyTaxYearly: Number(realEstate.propertyTaxYearly),
        insuranceYearly: Number(realEstate.insuranceYearly),
        maintenanceReserveMonthly: realEstate.maintenanceReserveMonthly
          ? Number(realEstate.maintenanceReserveMonthly)
          : null
      })

      // Valeur actuelle = cash investi initial + cashflow cumulÃ© (approximation sur 1 an)
      const currentValue = metrics.cashInitial + (metrics.cashflowNet * 12)
      const totalCost = metrics.cashInitial
      const gainLoss = currentValue - totalCost
      const performance = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0

      totalValue += currentValue
      totalCostBasis += totalCost

      const sparkline = generateSparkline(currentValue, performance, 7)

      const realEstateItem = {
        id: `re_${realEstate.id}`,
        type: 'immobilier',
        name: realEstate.name,
        subtitle: realEstate.address || realEstate.propertyType || 'Immobilier',
        platform: '-',
        value: currentValue,
        pl_value: gainLoss,
        pl_pct: performance,
        change_24h_pct: 0,
        sparkline,
        category: 'Immobilier',
        currency: 'EUR'
      }
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/investments/dashboard/route.ts:190',message:'Adding real estate item',data:{itemId:realEstateItem.id,itemName:realEstateItem.name,itemValue:realEstateItem.value},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      items.push(realEstateItem)
    }
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/investments/dashboard/route.ts:195',message:'After processing all items',data:{totalItemsCount:items.length,realEstateItemsCount:items.filter((i:any)=>i.type==='immobilier').length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Calculer le changement de pÃ©riode (simulation - nÃ©cessite des donnÃ©es historiques)
    const periodChangePct = totalCostBasis > 0 ? ((totalValue - totalCostBasis) / totalCostBasis) * 100 : 0

    // Calculer la rÃ©partition
    const allocation: Array<{ label: string; value: number }> = []
    const allocationMap: Record<string, number> = {}
    
    filteredAssets.forEach(asset => {
      const assetType = categoryToType[asset.category] || 'autres'
      const assetValue = Number((asset as any).currentValue || 0)
      if (!allocationMap[assetType]) {
        allocationMap[assetType] = 0
      }
      allocationMap[assetType] += assetValue
    })

    // Ajouter les investissements immobiliers Ã  la rÃ©partition
    filteredRealEstates.forEach(realEstate => {
      const metrics = computeRealEstateMetrics({
        purchasePrice: Number(realEstate.purchasePrice),
        notaryFees: Number(realEstate.notaryFees),
        initialWorks: Number(realEstate.initialWorks),
        downPayment: Number(realEstate.downPayment),
        loanMonthlyPayment: Number(realEstate.loanMonthlyPayment),
        loanInsuranceMonthly: Number(realEstate.loanInsuranceMonthly),
        rentMonthly: Number(realEstate.rentMonthly),
        vacancyRatePct: Number(realEstate.vacancyRatePct),
        nonRecoverableChargesMonthly: Number(realEstate.nonRecoverableChargesMonthly),
        propertyTaxYearly: Number(realEstate.propertyTaxYearly),
        insuranceYearly: Number(realEstate.insuranceYearly),
        maintenanceReserveMonthly: realEstate.maintenanceReserveMonthly
          ? Number(realEstate.maintenanceReserveMonthly)
          : null
      })
      const realEstateValue = metrics.cashInitial + (metrics.cashflowNet * 12)
      if (!allocationMap['immobilier']) {
        allocationMap['immobilier'] = 0
      }
      allocationMap['immobilier'] += realEstateValue
    })

    Object.entries(allocationMap).forEach(([label, value]) => {
      if (value > 0) {
        allocation.push({ label, value: Math.round((value / totalValue) * 100) })
      }
    })

    // Calculer les top et worst performers
    const sortedByPerformance = [...items].sort((a, b) => b.pl_pct - a.pl_pct)
    const top = sortedByPerformance.slice(0, 3).map(item => ({
      label: item.name,
      pct: item.pl_pct
    }))
    const worst = sortedByPerformance.slice(-3).reverse().map(item => ({
      label: item.name,
      pct: item.pl_pct
    }))

    // GÃ©nÃ©rer les sÃ©ries pour le graphique (simulation - nÃ©cessite des donnÃ©es historiques)
    const portfolioSeries = generatePortfolioSeries(totalValue, periodChangePct, period)

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/investments/dashboard/route.ts:311',message:'GET: Before success response',data:{totalValue,itemsCount:items.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    return NextResponse.json({
      total_value: totalValue,
      period_change_pct: periodChangePct,
      updated_at: now.toISOString(),
      portfolio_series: portfolioSeries,
      allocation,
      top,
      worst,
      items
    })
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ac321bcf-a383-476d-b03a-bfd3f887c5d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/investments/dashboard/route.ts:321',message:'GET: Error caught',data:{errorMessage:(error as Error)?.message,errorName:(error as Error)?.name,errorStack:(error as Error)?.stack?.substring(0,500)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    console.error('Dashboard API error:', error)
    const status = (error as Error)?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status }
    )
  }
}

// Fonction pour gÃ©nÃ©rer un sparkline simple
function generateSparkline(currentValue: number, performance: number, days: number): number[] {
  const sparkline: number[] = []
  const baseValue = currentValue / (1 + performance / 100)
  
  for (let i = 0; i < days; i++) {
    const progress = i / (days - 1)
    const value = baseValue + (currentValue - baseValue) * progress
    // Ajouter un peu de variation alÃ©atoire pour rendre le graphique plus rÃ©aliste
    const variation = (Math.random() - 0.5) * 0.02
    sparkline.push(value * (1 + variation))
  }
  
  return sparkline
}

// Fonction pour gÃ©nÃ©rer les sÃ©ries du portefeuille
function generatePortfolioSeries(totalValue: number, changePct: number, period: string): Array<{ t: string; v: number }> {
  const series: Array<{ t: string; v: number }> = []
  const now = new Date()
  let days = 30
  
  switch (period) {
    case '7d':
      days = 7
      break
    case '30d':
      days = 30
      break
    case '90d':
      days = 90
      break
    case '1y':
      days = 365
      break
    case 'all':
      days = 365
      break
  }

  const startValue = totalValue / (1 + changePct / 100)
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    
    const progress = i / days
    const value = startValue + (totalValue - startValue) * (1 - progress)
    // Ajouter un peu de variation
    const variation = (Math.random() - 0.5) * 0.03
    const finalValue = value * (1 + variation)
    
    series.push({
      t: date.toISOString().split('T')[0],
      v: Math.max(0, finalValue)
    })
  }
  
  return series
}
