/**
 * Service pour calculer les métriques d'investissement basées sur les prix de marché
 * Utilise strictement les prix de marché en USD et convertit les montants d'achat au taux de change historique
 */

import { getCoinGeckoPrice } from './coingecko-price'

interface PositionData {
  id: string
  quantity: number
  paidAmount: number
  paidCurrency: string
  purchaseDate: Date
  fxRateToQuote: number | null
}

interface InvestmentMetrics {
  buyPriceUsd: number
  currentPriceUsd: number
  valueUsd: number
  costUsd: number
  plUsd: number
  plPct: number
  quantity: number
  quoteCurrency: string
}

/**
 * Récupère le taux de change historique depuis une API
 * @param fromCurrency Devise source (ex: EUR)
 * @param toCurrency Devise cible (ex: USD)
 * @param date Date pour laquelle récupérer le taux
 * @returns Taux de change ou null si erreur
 */
export async function getHistoricalFxRate(
  fromCurrency: string,
  toCurrency: string,
  date: Date
): Promise<number | null> {
  try {
    // Utiliser exchangerate-api.com ou une API similaire pour les taux historiques
    // Format de date: YYYY-MM-DD
    const dateStr = date.toISOString().split('T')[0]

    // Si même devise, retourner 1
    if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
      return 1
    }

    // Utiliser exchangerate-api.com (gratuit jusqu'à 1500 requêtes/mois)
    const url = `https://api.exchangerate-api.com/v4/historical/${fromCurrency.toUpperCase()}/${dateStr}`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      console.warn(`⚠️ ExchangeRate API error for ${fromCurrency}/${toCurrency} on ${dateStr}, using fallback`)
      // Fallback: utiliser le taux actuel si historique indisponible
      return await getCurrentFxRate(fromCurrency, toCurrency)
    }

    const data = await response.json()
    const rate = data.rates?.[toCurrency.toUpperCase()]

    if (!rate || rate <= 0) {
      console.warn(`⚠️ Invalid rate for ${fromCurrency}/${toCurrency} on ${dateStr}, using fallback`)
      return await getCurrentFxRate(fromCurrency, toCurrency)
    }

    return rate
  } catch (error) {
    console.error(`❌ Error fetching historical FX rate:`, error)
    // Fallback vers taux actuel
    return await getCurrentFxRate(fromCurrency, toCurrency)
  }
}

/**
 * Récupère le taux de change actuel
 */
async function getCurrentFxRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number | null> {
  try {
    if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
      return 1
    }

    const url = `https://api.exchangerate-api.com/v4/latest/${fromCurrency.toUpperCase()}`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.rates?.[toCurrency.toUpperCase()] || null
  } catch (error) {
    console.error(`❌ Error fetching current FX rate:`, error)
    return null
  }
}

/**
 * Récupère le prix actuel d'un actif depuis CoinGecko
 * @param baseSymbol Symbole de base (ex: BTC, ETH, XAU)
 * @param quoteSymbol Symbole de quote (ex: USD, EUR)
 * @returns Prix actuel en quote ou null
 */
export async function getCurrentMarketPrice(
  baseSymbol: string,
  quoteSymbol: string
): Promise<number | null> {
  try {
    const symbol = `${baseSymbol}${quoteSymbol}`.toUpperCase()
    const result = await getCoinGeckoPrice(symbol)

    if (!result) {
      return null
    }

    // Vérifier que la devise correspond
    if (result.currency.toUpperCase() !== quoteSymbol.toUpperCase()) {
      console.warn(`⚠️ Currency mismatch: expected ${quoteSymbol}, got ${result.currency}`)
    }

    return result.price
  } catch (error) {
    console.error(`❌ Error fetching market price for ${baseSymbol}/${quoteSymbol}:`, error)
    return null
  }
}

/**
 * Calcule les métriques d'un investissement
 * @param positions Positions de l'investissement
 * @param baseSymbol Symbole de base (ex: BTC)
 * @param quoteSymbol Symbole de quote (ex: USD)
 * @returns Métriques calculées
 */
export async function computeInvestmentMetrics(
  positions: PositionData[],
  baseSymbol: string,
  quoteSymbol: string
): Promise<InvestmentMetrics | null> {
  try {
    // Récupérer le prix actuel du marché
    const currentPriceUsd = await getCurrentMarketPrice(baseSymbol, quoteSymbol)

    if (!currentPriceUsd || currentPriceUsd <= 0) {
      console.error(`❌ Invalid current price for ${baseSymbol}/${quoteSymbol}`)
      return null
    }

    // Calculer la quantité totale et le coût total en USD
    let totalQuantity = 0
    let totalCostUsd = 0

    for (const position of positions) {
      totalQuantity += position.quantity

      // Calculer le coût en USD pour cette position
      let costUsd = 0

      if (position.fxRateToQuote && position.fxRateToQuote > 0) {
        // Utiliser le taux de change stocké
        costUsd = position.paidAmount * position.fxRateToQuote
      } else {
        // Récupérer le taux de change historique
        const fxRate = await getHistoricalFxRate(
          position.paidCurrency,
          quoteSymbol,
          position.purchaseDate
        )

        if (fxRate && fxRate > 0) {
          costUsd = position.paidAmount * fxRate
        } else {
          // Fallback: utiliser le taux actuel (moins précis)
          const currentFxRate = await getCurrentFxRate(position.paidCurrency, quoteSymbol)
          if (currentFxRate && currentFxRate > 0) {
            costUsd = position.paidAmount * currentFxRate
          } else {
            console.warn(`⚠️ Could not get FX rate for ${position.paidCurrency}/${quoteSymbol}, skipping position`)
            continue
          }
        }
      }

      totalCostUsd += costUsd
    }

    if (totalQuantity <= 0) {
      return null
    }

    // Calculer le prix d'achat moyen en USD
    const buyPriceUsd = totalCostUsd / totalQuantity

    // Calculer la valeur actuelle en USD
    const valueUsd = totalQuantity * currentPriceUsd

    // Calculer le gain/perte
    const plUsd = valueUsd - totalCostUsd
    const plPct = totalCostUsd > 0 ? (plUsd / totalCostUsd) * 100 : 0

    return {
      buyPriceUsd,
      currentPriceUsd,
      valueUsd,
      costUsd: totalCostUsd,
      plUsd,
      plPct,
      quantity: totalQuantity,
      quoteCurrency: quoteSymbol
    }
  } catch (error) {
    console.error(`❌ Error computing investment metrics:`, error)
    return null
  }
}

