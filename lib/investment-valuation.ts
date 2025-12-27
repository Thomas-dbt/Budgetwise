/**
 * Utilitaires pour la valorisation des investissements selon leur mode
 */

export type ValuationMode = 'marché' | 'taux' | 'manuel' | 'import_externe'
export type CapitalizationMode = 'annuelle' | 'mensuelle' | 'quotidienne'

/**
 * Calcule la valeur actuelle d'un investissement en mode "taux"
 * @param baseAmount Montant de base (dépôts/retraits cumulés)
 * @param annualRate Taux annuel en pourcentage (ex: 3 pour 3%)
 * @param startDate Date de début du placement
 * @param capitalizationMode Mode de capitalisation
 * @returns Valeur actuelle calculée
 */
export function calculateRateBasedValue(
  baseAmount: number,
  annualRate: number,
  startDate: Date,
  capitalizationMode: CapitalizationMode = 'annuelle'
): number {
  const now = new Date()
  const yearsElapsed = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  
  if (yearsElapsed <= 0) {
    return baseAmount
  }

  const rateDecimal = annualRate / 100

  switch (capitalizationMode) {
    case 'annuelle':
      // Intérêts composés annuels: V = P * (1 + r)^t
      return baseAmount * Math.pow(1 + rateDecimal, yearsElapsed)
    
    case 'mensuelle':
      // Intérêts composés mensuels: V = P * (1 + r/12)^(12*t)
      return baseAmount * Math.pow(1 + rateDecimal / 12, 12 * yearsElapsed)
    
    case 'quotidienne':
      // Intérêts composés quotidiens: V = P * (1 + r/365)^(365*t)
      return baseAmount * Math.pow(1 + rateDecimal / 365, 365 * yearsElapsed)
    
    default:
      return baseAmount * (1 + rateDecimal * yearsElapsed) // Intérêts simples
  }
}

/**
 * Détermine le symbole à utiliser pour récupérer le prix de marché
 * @param symbol Symbole de base
 * @param category Catégorie de l'investissement
 * @param tradingViewSymbol Symbole TradingView personnalisé
 * @returns Symbole à utiliser pour l'API de prix
 */
export function getMarketSymbol(
  symbol: string | null,
  category: string,
  tradingViewSymbol: string | null
): { symbol: string; kind: string } | null {
  if (!symbol) return null

  const upperSymbol = symbol.toUpperCase()
  const upperCategory = category.toUpperCase()

  // Détecter l'or dans le symbole, la catégorie ou le tradingViewSymbol
  const isGold = upperSymbol === 'OR' || 
                 upperSymbol === 'GOLD' || 
                 upperSymbol === 'XAU' ||
                 upperSymbol.includes('OR') ||
                 upperCategory === 'OR' || 
                 upperCategory === 'GOLD' ||
                 upperCategory === 'MÉTAUX PRÉCIEUX' ||
                 (tradingViewSymbol && tradingViewSymbol.toUpperCase().includes('XAU'))

  // Si un symbole TradingView est défini, l'utiliser
  if (tradingViewSymbol) {
    const tvSymbol = tradingViewSymbol.toUpperCase()
    let symbolPart = tvSymbol
    
    // Extraire la partie après ":"
    if (tvSymbol.includes(':')) {
      const parts = tvSymbol.split(':')
      symbolPart = parts[1] || parts[0]
      
      // Déterminer le type basé sur le préfixe
      if (tvSymbol.includes('BINANCE')) {
        return { symbol: symbolPart, kind: 'crypto' }
      } else if (tvSymbol.includes('OANDA') || tvSymbol.includes('FX')) {
        if (symbolPart.includes('XAU') || isGold) {
          return { symbol: 'GC=F', kind: 'gold' }
        }
      }
    }
    
    // Si c'est de l'or dans le TradingView symbol
    if (isGold || tvSymbol.includes('XAU') || tvSymbol.includes('GOLD')) {
      return { symbol: 'GC=F', kind: 'gold' }
    }
    
    // Extraire le symbole de base
    if (symbolPart.includes('USD') || symbolPart.includes('EUR')) {
      const baseSymbol = symbolPart.replace('USD', '').replace('EUR', '').replace('-', '')
      const cryptoPattern = /^(BTC|ETH|BNB|ADA|SOL|DOT|MATIC|AVAX|LINK|UNI|LTC|XRP|DOGE|SHIB|ATOM|ALGO|NEAR|FTM|SAND|MANA|AXS|GALA|ENJ|CHZ|FLOW|ICP|FIL|AAVE|COMP|MKR|CRV|YFI|SNX|SUSHI|CAKE|1INCH|BAL|BAND|BAT|BCH|BNT|CELR|CHR|COTI|CTSI|CVC|DASH|DATA|DENT|DOCK|ENJ|EOS|ETC|FET|FUN|GNT|GTO|ICX|INS|IOST|IOTA|KMD|KNC|LRC|LTC|MANA|MITH|MKR|MTL|NANO|NEO|NKN|NPXS|NULS|OMG|ONT|PAX|POLY|POWR|QTUM|RCN|RDN|REN|REP|RLC|SC|SKY|SNT|STORJ|STORM|STRAT|SUB|TNB|TNT|TRX|TUSD|USDC|USDT|VEN|VET|VIB|VIBE|WABI|WAVES|WINGS|WTC|XEM|XLM|XMR|XRP|XVG|XZC|YOYO|ZEC|ZEN|ZIL|ZRX)$/i
      if (cryptoPattern.test(baseSymbol)) {
        return { symbol: baseSymbol, kind: 'crypto' }
      }
    } else if (symbolPart.includes('-')) {
      return { symbol: symbolPart.split('-')[0], kind: 'crypto' }
    } else {
      return { symbol: symbolPart, kind: category.toLowerCase() }
    }
  }

  // Pour l'or, utiliser GC=F (futures COMEX) qui donne le prix en dollars par once troy
  if (isGold) {
    return { symbol: 'GC=F', kind: 'gold' }
  }

  // Déterminer le type selon la catégorie
  let kind = 'stock'
  if (category === 'Crypto') {
    kind = 'crypto'
  } else if (category === 'ETF') {
    kind = 'etf'
  }

  return { symbol: symbol.toUpperCase(), kind }
}
