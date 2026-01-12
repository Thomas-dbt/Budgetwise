import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/server-auth'
import { calculateRateBasedValue, getMarketSymbol } from '@/lib/investment-valuation'

export async function GET(req: Request) {
  try {
    const userId = await getCurrentUserId()

    // Récupérer tous les actifs avec leurs positions
    // Utiliser select pour éviter les erreurs si certains champs n'existent pas encore
    const assets = await prisma.investmentAsset.findMany({
      where: { userId },
      include: {
        positions: true
      }
    }).catch((error) => {
      console.error('Error fetching assets:', error)
      // Si erreur, essayer avec une requête plus simple
      return prisma.$queryRaw`
        SELECT * FROM InvestmentAsset WHERE userId = ${userId}
      ` as any
    })

    // Calculer les statistiques du portefeuille
    let totalValue = 0
    let totalPortfolioCostBasis = 0
    const investments: any[] = []

    // Récupérer les prix de marché pour les investissements en mode "marché"
    // Utiliser des accès sécurisés pour gérer l'ancien schéma
    const marketAssets = assets.filter((asset: any) => {
      const valuationMode = (asset as any).valuationMode || (asset.manualPriceEnabled ? 'manuel' : 'marché')
      const readOnly = (asset as any).readOnly || false
      return valuationMode === 'marché' && !readOnly
    })
    const currentPrices: Record<string, number> = {}

    // Fonction pour récupérer le prix d'un actif depuis Yahoo Finance
    const fetchPrice = async (symbol: string, category: string, tradingViewSymbol?: string | null) => {
      try {
        const marketSymbol = getMarketSymbol(symbol, category, tradingViewSymbol)
        if (!marketSymbol) return null

        const yahooSymbol = marketSymbol.kind === 'crypto'
          ? `${marketSymbol.symbol}-USD`
          : marketSymbol.symbol

        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`
        const response = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        })

        if (response.ok) {
          const data = await response.json()
          if (data.chart?.result?.[0]?.meta) {
            return data.chart.result[0].meta.regularMarketPrice ||
              data.chart.result[0].meta.previousClose ||
              null
          }
        }
      } catch (error) {
        console.error(`Error fetching price for ${symbol}:`, error)
      }
      return null
    }

    // Récupérer tous les prix en parallèle
    const pricePromises = marketAssets
      .filter((asset: any) => asset.symbol)
      .map((asset: any) => {
        const category = asset.category || (asset.kind === 'stock' ? 'Action' : asset.kind === 'etf' ? 'ETF' : asset.kind === 'crypto' ? 'Crypto' : 'Action')
        return fetchPrice(asset.symbol, category, asset.tradingViewSymbol).then(price => ({
          id: asset.id,
          price: price
        }))
      })
    const priceResults = await Promise.all(pricePromises)
    priceResults.forEach(({ id, price }) => {
      if (price !== null) {
        currentPrices[id] = price
      }
    })

    // Traiter chaque actif selon son mode de valorisation
    for (const asset of assets) {
      // Utiliser des accès sécurisés pour gérer l'ancien et le nouveau schéma
      const assetAny = asset as any
      const valuationMode = assetAny.valuationMode || (assetAny.manualPriceEnabled ? 'manuel' : 'marché')
      const category = assetAny.category || (assetAny.kind === 'stock' ? 'Action' : assetAny.kind === 'etf' ? 'ETF' : assetAny.kind === 'crypto' ? 'Crypto' : 'Action')

      // Calculer la quantité totale et le coût moyen depuis les positions
      let totalQuantity = Number(assetAny.quantity) || 1
      let totalCostBasis = 0

      if (assetAny.positions && assetAny.positions.length > 0) {
        totalQuantity = 0
        for (const position of assetAny.positions) {
          const qty = Number(position.quantity)
          const cost = Number(position.costBasis)
          totalQuantity += qty
          totalCostBasis += qty * cost
        }
      } else if (assetAny.amountInvested) {
        totalCostBasis = Number(assetAny.amountInvested)
      }

      const averageCostBasis = totalQuantity > 0 ? totalCostBasis / totalQuantity : 0

      // Calculer la valeur actuelle selon le mode de valorisation
      let currentPrice: number | null = null
      let currentValue = 0
      let lastValuationDate = assetAny.lastValuationDate

      switch (valuationMode) {
        case 'marché':
          // Récupérer le prix depuis l'API ou utiliser le prix stocké
          currentPrice = currentPrices[assetAny.id] || (assetAny.currentPrice ? Number(assetAny.currentPrice) : null)

          if (!currentPrice && assetAny.currentPrice) {
            currentPrice = Number(assetAny.currentPrice)
          } else if (!currentPrice) {
            // Estimation basée sur le coût moyen
            currentPrice = averageCostBasis * 1.05
          }

          currentValue = totalQuantity * currentPrice
          if (currentPrices[assetAny.id]) {
            lastValuationDate = new Date()
          }
          break

        case 'taux':
          // Calculer la valeur avec intérêts composés
          if (assetAny.baseAmount && assetAny.annualRate && assetAny.startDate) {
            currentValue = calculateRateBasedValue(
              Number(assetAny.baseAmount),
              Number(assetAny.annualRate),
              assetAny.startDate instanceof Date ? assetAny.startDate : new Date(assetAny.startDate),
              (assetAny.capitalizationMode as any) || 'annuelle'
            )
            currentPrice = currentValue / (totalQuantity || 1)
            lastValuationDate = new Date()
          } else {
            // Fallback sur le montant de base
            currentValue = assetAny.baseAmount ? Number(assetAny.baseAmount) : totalCostBasis
            currentPrice = currentValue / (totalQuantity || 1)
          }
          break

        case 'manuel':
          // Utiliser le prix manuel
          if (assetAny.manualPrice !== null && assetAny.manualPrice !== undefined) {
            currentPrice = Number(assetAny.manualPrice)
            currentValue = totalQuantity * currentPrice
          } else if (assetAny.currentPrice !== null && assetAny.currentPrice !== undefined) {
            currentPrice = Number(assetAny.currentPrice)
            currentValue = totalQuantity * currentPrice
          } else {
            currentPrice = averageCostBasis
            currentValue = totalQuantity * currentPrice
          }
          break

        case 'import_externe':
          // Utiliser la valeur importée (ne pas la modifier)
          if (assetAny.currentValue !== null && assetAny.currentValue !== undefined) {
            currentValue = Number(assetAny.currentValue)
            currentPrice = totalQuantity > 0 ? currentValue / totalQuantity : 0
          } else if (assetAny.currentPrice !== null && assetAny.currentPrice !== undefined) {
            currentPrice = Number(assetAny.currentPrice)
            currentValue = totalQuantity * currentPrice
          } else {
            currentPrice = averageCostBasis
            currentValue = totalQuantity * currentPrice
          }
          break

        default:
          // Fallback
          currentPrice = averageCostBasis
          currentValue = totalQuantity * currentPrice
      }

      // Mettre à jour la valeur actuelle dans la base si nécessaire (sauf pour import_externe en lecture seule)
      const readOnly = assetAny.readOnly || false
      if (!readOnly && valuationMode !== 'import_externe') {
        const needsUpdate =
          Math.abs(Number(assetAny.currentValue || 0) - currentValue) > 0.01 ||
          (assetAny.lastValuationDate === null && lastValuationDate !== null)

        if (needsUpdate) {
          try {
            await prisma.investmentAsset.update({
              where: { id: assetAny.id },
              data: {
                ...(assetAny.currentValue !== undefined && { currentValue }),
                ...(assetAny.currentPrice !== undefined && { currentPrice }),
                ...(assetAny.lastValuationDate !== undefined && { lastValuationDate: lastValuationDate || undefined })
              }
            })
          } catch (updateError) {
            // Ignorer les erreurs de mise à jour si les champs n'existent pas encore
            console.warn('Could not update asset values (fields may not exist yet):', updateError)
          }
        }
      }

      const gainLoss = currentValue - totalCostBasis
      const performance = totalCostBasis > 0 ? (gainLoss / totalCostBasis) * 100 : 0

      totalValue += currentValue
      totalPortfolioCostBasis += totalCostBasis

      investments.push({
        id: assetAny.id,
        name: assetAny.name || assetAny.symbol || 'Investissement',
        symbol: assetAny.symbol || null,
        category: category,
        subCategory: assetAny.subCategory || null,
        platform: assetAny.platform || null,
        currency: assetAny.currency || 'EUR',
        comment: assetAny.comment || null,
        valuationMode: valuationMode as any,
        readOnly: readOnly,
        source: assetAny.source || (valuationMode === 'manuel' ? 'manuel' : valuationMode === 'marché' ? 'yahoo_finance' : null),
        quantity: totalQuantity,
        currentPrice,
        currentValue,
        amountInvested: assetAny.amountInvested ? Number(assetAny.amountInvested) : totalCostBasis,
        lastValuationDate: assetAny.lastValuationDate ? (assetAny.lastValuationDate instanceof Date ? assetAny.lastValuationDate.toISOString() : assetAny.lastValuationDate) : null,
        tradingViewSymbol: assetAny.tradingViewSymbol || null,
        priceProvider: assetAny.priceProvider || null,
        baseAmount: assetAny.baseAmount ? Number(assetAny.baseAmount) : null,
        annualRate: assetAny.annualRate ? Number(assetAny.annualRate) : null,
        capitalizationMode: assetAny.capitalizationMode || null,
        startDate: assetAny.startDate ? (assetAny.startDate instanceof Date ? assetAny.startDate.toISOString() : assetAny.startDate) : null,
        manualPrice: assetAny.manualPrice ? Number(assetAny.manualPrice) : null,
        externalId: assetAny.externalId || null,
        importBatchId: assetAny.importBatchId || null,
        // Champs calculés
        costBasis: averageCostBasis,
        totalValue: currentValue,
        gainLoss,
        performance,
        // Compatibilité
        kind: assetAny.kind || null,
        manualPriceEnabled: valuationMode === 'manuel'
      })
    }

    const totalGainLoss = totalValue - totalPortfolioCostBasis
    const totalPerformance = totalPortfolioCostBasis > 0 ? (totalGainLoss / totalPortfolioCostBasis) * 100 : 0

    // Calculer la répartition par catégorie
    const distributionByCategory = investments.reduce((acc: Record<string, { value: number; label: string }>, inv: any) => {
      const cat = inv.category || 'Autre'
      if (!acc[cat]) {
        acc[cat] = { value: 0, label: cat }
      }
      acc[cat].value += inv.totalValue || 0
      return acc
    }, {} as Record<string, { value: number; label: string }>)

    // Calculer la répartition par plateforme
    const distributionByPlatform = investments.reduce((acc: Record<string, { value: number; label: string }>, inv: any) => {
      const plat = inv.platform || 'Non spécifiée'
      if (!acc[plat]) {
        acc[plat] = { value: 0, label: plat }
      }
      acc[plat].value += inv.totalValue || 0
      return acc
    }, {} as Record<string, { value: number; label: string }>)

    const distributionByCategoryArray = Object.values(distributionByCategory).map(item => ({
      ...item,
      percentage: totalValue > 0 ? (item.value / totalValue) * 100 : 0
    }))

    const distributionByPlatformArray = Object.values(distributionByPlatform).map(item => ({
      ...item,
      percentage: totalValue > 0 ? (item.value / totalValue) * 100 : 0
    }))

    return NextResponse.json({
      totalValue,
      totalGainLoss,
      totalPerformance,
      investments,
      distribution: distributionByCategoryArray,
      distributionByCategory: distributionByCategoryArray,
      distributionByPlatform: distributionByPlatformArray
    })
  } catch (error) {
    console.error('Investments API error:', error)
    const status = (error as Error)?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: 'Failed to fetch investments' },
      { status }
    )
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json()
    const {
      name, symbol, category, subCategory, platform, currency, comment,
      valuationMode, quantity, amountInvested,
      // Mode marché
      tradingViewSymbol, priceProvider, baseSymbol, quoteSymbol,
      // Mode taux
      baseAmount, annualRate, capitalizationMode, startDate,
      // Mode manuel
      manualPrice
    } = body

    if (!name || !category || !valuationMode) {
      return NextResponse.json({ error: 'Champs obligatoires manquants (name, category, valuationMode)' }, { status: 400 })
    }

    // Vérifier si l'actif existe déjà (par nom + plateforme ou symbol)
    // Utiliser une requête compatible avec l'ancien et le nouveau schéma
    let asset = null
    try {
      // Essayer d'abord avec le nouveau schéma (si disponible)
      asset = await prisma.investmentAsset.findFirst({
        where: {
          userId,
          OR: [
            ...(symbol ? [{ symbol: symbol.toUpperCase() }] : []),
            { name, ...(platform ? { platform } : {}) }
          ]
        }
      } as any)
    } catch (error: any) {
      // Si erreur (champs non disponibles), essayer avec l'ancien schéma
      console.warn('Using fallback query (new fields may not be available yet):', error.message)
      asset = await prisma.investmentAsset.findFirst({
        where: {
          userId,
          OR: [
            ...(symbol ? [{ symbol: symbol.toUpperCase() }] : []),
            { name }
          ]
        }
      } as any)
    }

    // Créer l'actif s'il n'existe pas
    if (!asset) {
      // Déterminer kind pour compatibilité avec l'ancien schéma
      const kind = category === 'Crypto' ? 'crypto' : category === 'ETF' ? 'etf' : 'stock'

      const assetData: any = {
        userId,
        name,
        symbol: symbol ? symbol.toUpperCase() : null,
        kind, // Requis pour compatibilité
        // Utiliser des valeurs par défaut pour compatibilité
        category: category || 'Action',
        ...(subCategory && { subCategory }),
        ...(platform && { platform }),
        currency: currency || 'EUR',
        ...(comment && { comment }),
        valuationMode: valuationMode || 'marché',
        readOnly: false,
        quantity: quantity ? Number(quantity) : 1,
        ...(amountInvested && { amountInvested: Number(amountInvested) })
      }

      // Données spécifiques selon le mode
      switch (valuationMode) {
        case 'marché':
          if (tradingViewSymbol) assetData.tradingViewSymbol = tradingViewSymbol
          if (baseSymbol) assetData.baseSymbol = baseSymbol.toUpperCase()
          if (quoteSymbol) assetData.quoteSymbol = quoteSymbol.toUpperCase()
          assetData.priceProvider = priceProvider || 'coingecko'
          assetData.source = tradingViewSymbol ? 'tradingview' : 'coingecko'
          break

        case 'taux':
          if (!baseAmount || !annualRate || !startDate) {
            return NextResponse.json({ error: 'Mode taux nécessite baseAmount, annualRate et startDate' }, { status: 400 })
          }
          assetData.baseAmount = Number(baseAmount)
          assetData.annualRate = Number(annualRate)
          assetData.capitalizationMode = capitalizationMode || 'annuelle'
          assetData.startDate = new Date(startDate)
          assetData.source = 'taux_calcule'
          // Calculer la valeur initiale
          assetData.currentValue = Number(baseAmount)
          break

        case 'manuel':
          if (!manualPrice) {
            return NextResponse.json({ error: 'Mode manuel nécessite manualPrice' }, { status: 400 })
          }
          assetData.manualPrice = Number(manualPrice)
          assetData.currentPrice = Number(manualPrice)
          assetData.currentValue = (assetData.quantity || 1) * Number(manualPrice)
          assetData.source = 'manuel'
          assetData.lastValuationDate = new Date()
          break

        case 'import_externe':
          return NextResponse.json({ error: 'Les investissements en mode import_externe doivent être créés via l\'API d\'import' }, { status: 400 })
      }

      try {
        asset = await prisma.investmentAsset.create({
          data: assetData
        } as any)
      } catch (createError: any) {
        console.error('Error creating asset:', createError)
        // Si erreur due à des champs manquants, créer avec seulement les champs de base
        if (createError.message?.includes('Unknown argument') || createError.message?.includes('does not exist') || createError.message?.includes('is missing')) {
          const basicAssetData: any = {
            userId,
            name,
            symbol: symbol ? symbol.toUpperCase() : null,
            kind: category === 'Crypto' ? 'crypto' : category === 'ETF' ? 'etf' : 'stock',
            quantity: quantity ? Number(quantity) : 1
          }
          // Ajouter les champs optionnels seulement s'ils existent
          if (valuationMode === 'manuel' && manualPrice) {
            basicAssetData.manualPriceEnabled = true
            basicAssetData.manualPrice = Number(manualPrice)
          }
          asset = await prisma.investmentAsset.create({
            data: basicAssetData
          })
        } else {
          throw createError
        }
      }

      // Si une quantité et un coût sont fournis, créer une position
      if (amountInvested && quantity) {
        await prisma.position.create({
          data: {
            assetId: asset.id,
            quantity: Number(quantity),
            costBasis: Number(amountInvested) / Number(quantity)
          }
        })
      }

      // --- LOGIQUE AJOUTÉE POUR TRANSACTION ---
      // Si l'option 'créer une transaction' est cochée
      const { createTransaction, sourceAccountId, transactionDate } = body
      if (createTransaction && sourceAccountId && amountInvested) {
        try {
          // 1. Déterminer la catégorie de transaction
          // MAPPING
          // Crypto -> Investissement / Crypto
          // Action -> Investissement / Bourse
          // ETF -> Investissement / Bourse
          // Immobilier -> Investissement / Immobilier
          // Livret -> Epargne / Livrets

          let categoryName = 'Investissement'
          let subCategoryName = 'Autres placements'

          if (category === 'Crypto') subCategoryName = 'Crypto'
          else if (category === 'Action' || category === 'ETF') subCategoryName = 'Bourse'
          else if (category === 'Immobilier') subCategoryName = 'Immobilier'
          else if (category === 'Livret') {
            categoryName = 'Épargne'
            subCategoryName = 'Livrets'
          }

          // Trouver les IDs de catégories
          const cat = await prisma.category.findFirst({
            where: {
              name: categoryName,
              userId: null // Catégorie système ou globale si on ne filtre pas par userId (mais attention aux doublons user)
            }
          }) || await prisma.category.findFirst({
            where: { name: categoryName } // Un peu large mais fallback
          })

          let categoryId = cat?.id
          let subCategoryId = null

          if (cat) {
            const sub = await prisma.category.findFirst({
              where: {
                name: subCategoryName,
                parentId: cat.id
              }
            })
            if (sub) {
              // Pour la transaction, on met l'ID de la sous-catégorie si le modèle le demande, ou la catégorie principale + sous-cat
              // Le modèle transaction stocke categoryId. Notre API attend le bon ID.
              subCategoryId = sub.id
            }
          }

          // 2. Créer la transaction
          const numericAmount = Number(amountInvested)
          const txDate = transactionDate ? new Date(transactionDate) : new Date()

          await prisma.transaction.create({
            data: {
              accountId: sourceAccountId,
              amount: -Math.abs(numericAmount), // Dépense donc négatif
              type: 'expense',
              date: txDate,
              description: `Achat ${name}`,
              categoryId: subCategoryId || categoryId, // On essaie de mettre la sous-catégorie directement si c'est ce que l'app attend
            }
          })

          // 3. Mettre à jour le solde du compte
          await prisma.account.update({
            where: { id: sourceAccountId },
            data: {
              balance: { decrement: Math.abs(numericAmount) }
            }
          })

        } catch (txError) {
          console.error('Error auto-creating transaction from investment:', txError)
        }
      }
      // ----------------------------------------
    } else {
      // Mettre à jour l'actif existant
      const updateData: any = {
        name,
        ...(symbol !== undefined && { symbol: symbol ? symbol.toUpperCase() : null }),
        category,
        ...(subCategory !== undefined && { subCategory: subCategory || null }),
        ...(platform !== undefined && { platform: platform || null }),
        ...(currency !== undefined && { currency: currency || 'EUR' }),
        ...(comment !== undefined && { comment: comment || null }),
        ...(quantity !== undefined && { quantity: Number(quantity) }),
        ...(amountInvested !== undefined && { amountInvested: amountInvested ? Number(amountInvested) : null })
      }

      // Mettre à jour selon le mode
      if (valuationMode === 'marché') {
        if (tradingViewSymbol !== undefined) updateData.tradingViewSymbol = tradingViewSymbol || null
        if (priceProvider !== undefined) updateData.priceProvider = priceProvider || 'yahoo_finance'
        updateData.source = tradingViewSymbol ? 'tradingview' : 'yahoo_finance'
      } else if (valuationMode === 'taux') {
        if (baseAmount !== undefined) updateData.baseAmount = Number(baseAmount)
        if (annualRate !== undefined) updateData.annualRate = Number(annualRate)
        if (capitalizationMode !== undefined) updateData.capitalizationMode = capitalizationMode || 'annuelle'
        if (startDate !== undefined) updateData.startDate = new Date(startDate)
        updateData.source = 'taux_calcule'
      } else if (valuationMode === 'manuel') {
        if (manualPrice !== undefined) {
          updateData.manualPrice = Number(manualPrice)
          updateData.currentPrice = Number(manualPrice)
          updateData.currentValue = (quantity || asset.quantity || 1) * Number(manualPrice)
          updateData.lastValuationDate = new Date()
        }
        updateData.source = 'manuel'
      }

      try {
        asset = await prisma.investmentAsset.update({
          where: { id: asset.id },
          data: updateData
        } as any)
      } catch (updateError: any) {
        console.error('Error updating asset:', updateError)
        // Si erreur due à des champs manquants, mettre à jour seulement les champs de base
        if (updateError.message?.includes('Unknown argument') || updateError.message?.includes('does not exist')) {
          const basicUpdateData: any = {
            name,
            ...(symbol !== undefined && { symbol: symbol ? symbol.toUpperCase() : null }),
            ...(quantity !== undefined && { quantity: Number(quantity) })
          }
          if (valuationMode === 'manuel' && manualPrice) {
            basicUpdateData.manualPriceEnabled = true
            basicUpdateData.manualPrice = Number(manualPrice)
          }
          asset = await prisma.investmentAsset.update({
            where: { id: asset.id },
            data: basicUpdateData
          })
        } else {
          throw updateError
        }
      }
    }

    return NextResponse.json({ asset }, { status: 201 })
  } catch (error: any) {
    console.error('Investments POST error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    const errorMessage = error?.message || 'Impossible de créer l\'investissement'
    return NextResponse.json(
      { error: errorMessage },
      { status }
    )
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json()
    const {
      id, name, symbol, category, subCategory, platform, currency, comment,
      valuationMode, quantity, amountInvested, readOnly,
      tradingViewSymbol, priceProvider,
      baseAmount, annualRate, capitalizationMode, startDate,
      manualPrice, currentPrice, currentValue
    } = body

    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
    }

    // Vérifier que l'actif appartient à l'utilisateur
    const existing = await prisma.investmentAsset.findUnique({
      where: { id }
    })

    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Investissement introuvable' }, { status: 404 })
    }

    // Vérifier si l'investissement est en lecture seule
    if (existing.readOnly && readOnly !== false) {
      return NextResponse.json({ error: 'Cet investissement est en lecture seule et ne peut pas être modifié' }, { status: 403 })
    }

    const updateData: any = {
      ...(name !== undefined && { name }),
      ...(symbol !== undefined && { symbol: symbol ? symbol.toUpperCase() : null }),
      ...(category !== undefined && { category }),
      ...(subCategory !== undefined && { subCategory: subCategory || null }),
      ...(platform !== undefined && { platform: platform || null }),
      ...(currency !== undefined && { currency }),
      ...(comment !== undefined && { comment: comment || null }),
      ...(valuationMode !== undefined && { valuationMode }),
      ...(quantity !== undefined && { quantity: Number(quantity) }),
      ...(amountInvested !== undefined && { amountInvested: amountInvested ? Number(amountInvested) : null }),
      ...(readOnly !== undefined && { readOnly })
    }

    // Mettre à jour selon le mode de valorisation
    if (valuationMode === 'marché' || existing.valuationMode === 'marché') {
      if (tradingViewSymbol !== undefined) updateData.tradingViewSymbol = tradingViewSymbol || null
      if (priceProvider !== undefined) updateData.priceProvider = priceProvider || 'yahoo_finance'
      updateData.source = tradingViewSymbol ? 'tradingview' : 'yahoo_finance'
    }

    if (valuationMode === 'taux' || existing.valuationMode === 'taux') {
      if (baseAmount !== undefined) updateData.baseAmount = baseAmount ? Number(baseAmount) : null
      if (annualRate !== undefined) updateData.annualRate = annualRate ? Number(annualRate) : null
      if (capitalizationMode !== undefined) updateData.capitalizationMode = capitalizationMode || null
      if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null
      updateData.source = 'taux_calcule'
    }

    if (valuationMode === 'manuel' || existing.valuationMode === 'manuel') {
      if (manualPrice !== undefined) {
        updateData.manualPrice = manualPrice ? Number(manualPrice) : null
        updateData.currentPrice = manualPrice ? Number(manualPrice) : null
        updateData.lastValuationDate = new Date()
      }
      updateData.source = 'manuel'
    }

    if (currentPrice !== undefined) updateData.currentPrice = currentPrice ? Number(currentPrice) : null
    if (currentValue !== undefined) updateData.currentValue = currentValue ? Number(currentValue) : null

    const asset = await prisma.investmentAsset.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(asset)
  } catch (error: any) {
    console.error('Investments PATCH error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: 'Impossible de modifier l\'investissement' },
      { status }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await getCurrentUserId()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
    }

    // Vérifier que l'actif appartient à l'utilisateur
    const existing = await prisma.investmentAsset.findUnique({
      where: { id }
    })

    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Investissement introuvable' }, { status: 404 })
    }

    // Vérifier si l'investissement est en lecture seule
    if (existing.readOnly) {
      return NextResponse.json({ error: 'Cet investissement est en lecture seule et ne peut pas être supprimé' }, { status: 403 })
    }

    // Supprimer l'actif (les positions seront supprimées en cascade)
    await prisma.investmentAsset.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Investments DELETE error:', error)
    const status = error?.message === 'UNAUTHORIZED' ? 401 : 500
    return NextResponse.json(
      { error: 'Impossible de supprimer l\'investissement' },
      { status }
    )
  }
}


