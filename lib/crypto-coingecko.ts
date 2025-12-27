/**
 * Fonction utilitaire pour mapper les symboles crypto vers CoinGecko ID
 * et récupérer les prix depuis CoinGecko
 */

interface CoinGeckoCryptoPriceResult {
  price: number // Prix dans la devise quote (USD, EUR, etc.)
  currency: string // Devise de cotation
  coinGeckoId: string // ID CoinGecko utilisé
}

/**
 * Mappe un symbole crypto (ex: BTC, ETH) vers un CoinGecko ID
 * @param baseSymbol Symbole de base (ex: BTC, ETH, SOL)
 * @returns CoinGecko ID (ex: bitcoin, ethereum, solana)
 */
export function mapCryptoToCoinGeckoId(baseSymbol: string): string {
  const mapping: Record<string, string> = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'BNB': 'binancecoin',
    'SOL': 'solana',
    'XRP': 'ripple',
    'ADA': 'cardano',
    'DOGE': 'dogecoin',
    'DOT': 'polkadot',
    'MATIC': 'matic-network',
    'AVAX': 'avalanche-2',
    'LINK': 'chainlink',
    'UNI': 'uniswap',
    'LTC': 'litecoin',
    'ATOM': 'cosmos',
    'ETC': 'ethereum-classic',
    'XLM': 'stellar',
    'ALGO': 'algorand',
    'VET': 'vechain',
    'ICP': 'internet-computer',
    'FIL': 'filecoin',
    'TRX': 'tron',
    'EOS': 'eos',
    'AAVE': 'aave',
    'MKR': 'maker',
    'COMP': 'compound-governance-token',
    'YFI': 'yearn-finance',
    'SUSHI': 'sushi',
    'SNX': 'havven',
    'CRV': 'curve-dao-token',
    '1INCH': '1inch',
    'BAL': 'balancer',
    'ZRX': '0x',
    'ENJ': 'enjincoin',
    'MANA': 'decentraland',
    'SAND': 'the-sandbox',
    'AXS': 'axie-infinity',
    'GALA': 'gala',
    'CHZ': 'chiliz',
    'FLOW': 'flow',
    'NEAR': 'near',
    'FTM': 'fantom',
    'HBAR': 'hedera-hashgraph',
    'EGLD': 'elrond-erd-2',
    'THETA': 'theta-token',
    'ZIL': 'zilliqa',
    'IOTA': 'iota',
    'WAVES': 'waves',
    'XTZ': 'tezos',
    'DASH': 'dash',
    'ZEC': 'zcash',
    'BCH': 'bitcoin-cash',
    'BSV': 'bitcoin-sv',
    'XMR': 'monero',
    'DCR': 'decred',
    'QTUM': 'qtum',
    'OMG': 'omisego',
    'ZEN': 'zencash',
    'BAT': 'basic-attention-token',
    'REP': 'augur',
    'KNC': 'kyber-network-crystal',
    'STORJ': 'storj',
    'GNT': 'golem',
    'LOOM': 'loom-network',
    'CVC': 'civic',
    'RLC': 'iexec-rlc',
    'SNT': 'status',
    'FUN': 'funfair',
    'KMD': 'komodo',
    'SALT': 'salt',
    'POWR': 'power-ledger',
    'SUB': 'substratum',
    'CND': 'cindicator',
    'WTC': 'waltonchain',
    'DATA': 'streamr-datacoin',
    'ICX': 'icon',
    'SC': 'siacoin',
    'STEEM': 'steem',
    'ARK': 'ark',
    'RCN': 'ripio-credit-network',
    'EDG': 'edgeless',
    'WINGS': 'wings',
    'TRST': 'trust',
    'LUN': 'lunyr',
    'RDN': 'raiden-network-token',
    'DLT': 'agrello',
    'AMB': 'ambrosus',
    'BCC': 'bitconnect',
    'BQX': 'ethos',
    'EVX': 'everex',
    'REQ': 'request-network',
    'VIB': 'viberate',
    'HSR': 'hshare',
    'YOYOW': 'yoyow',
    'SRN': 'sirin-labs-token',
    'CTR': 'centra',
    'FUEL': 'etherparty',
    'VIBE': 'vibe',
    'MER': 'mercury',
    'DNT': 'district0x',
    'ADX': 'adex',
    'PAY': 'tenx',
    'LSK': 'lisk',
    'PIVX': 'pivx',
    'TNT': 'tierion',
    'FCT': 'factom',
    'IOC': 'iocoin',
    'DGB': 'digibyte',
    'BURST': 'burst',
    'CLAM': 'clams',
    'EMC2': 'einsteinium',
    'FLDC': 'foldingcoin',
    'FLO': 'florincoin',
    'GAME': 'gamecredits',
    'GRC': 'gridcoin',
    'HUC': 'huntercoin',
    'LBC': 'library-credit',
    'MAID': 'maidsafecoin',
    'OMNI': 'omni',
    'NAV': 'nav-coin',
    'NEOS': 'neoscoin',
    'NMC': 'namecoin',
    'NXT': 'nxt',
    'PINK': 'pinkcoin',
    'POT': 'potcoin',
    'PPC': 'peercoin',
    'RDD': 'reddcoin',
    'SYS': 'syscoin',
    'VIA': 'viacoin',
    'VRC': 'vericoin',
    'VTC': 'vertcoin',
    'XBC': 'bitcoin-plus',
    'XCP': 'counterparty',
    'XEM': 'nem',
    'XPM': 'primecoin'
  }

  const upperSymbol = baseSymbol.toUpperCase()
  return mapping[upperSymbol] || upperSymbol.toLowerCase()
}

/**
 * Récupère le prix d'une crypto depuis CoinGecko
 * @param baseSymbol Symbole de base (ex: BTC, ETH)
 * @param quoteCurrency Devise de cotation (USD, EUR, etc.)
 * @returns Prix dans la devise quote
 */
export async function getCryptoPriceFromCoinGecko(
  baseSymbol: string,
  quoteCurrency: string = 'USD'
): Promise<CoinGeckoCryptoPriceResult | null> {
  try {
    const coinGeckoId = mapCryptoToCoinGeckoId(baseSymbol)
    const currencyLower = quoteCurrency.toLowerCase()

    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinGeckoId}&vs_currencies=${currencyLower},usd,eur`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ CoinGecko API error ${response.status}:`, errorText)
      throw new Error(`Erreur HTTP ${response.status} pour CoinGecko ${coinGeckoId}`)
    }

    const data = await response.json()

    if (!data[coinGeckoId]) {
      throw new Error(`Aucune donnée disponible pour ${coinGeckoId}`)
    }

    const priceData = data[coinGeckoId]

    // Récupérer le prix dans la devise demandée
    let price = priceData[currencyLower] || 0
    let finalCurrency = quoteCurrency

    // Fallback sur USD puis EUR si nécessaire
    if (price === 0 || !priceData[currencyLower]) {
      if (priceData.usd) {
        price = priceData.usd
        finalCurrency = 'USD'
      } else if (priceData.eur) {
        price = priceData.eur
        finalCurrency = 'EUR'
      } else {
        const availableCurrency = Object.keys(priceData).find(key => priceData[key] > 0)
        if (availableCurrency) {
          price = priceData[availableCurrency]
          finalCurrency = availableCurrency.toUpperCase()
        }
      }
    }

    if (price === 0 || !price) {
      throw new Error(`Prix invalide pour ${coinGeckoId} en ${quoteCurrency}`)
    }

    return {
      price,
      currency: finalCurrency,
      coinGeckoId
    }
  } catch (error: any) {
    console.error(`❌ CoinGecko price error for ${baseSymbol}:`, error?.message || error)
    return null
  }
}

