# Système de Métriques d'Investissement Basé sur les Prix de Marché

## Vue d'ensemble

Ce système calcule les métriques d'investissement en utilisant **strictement les prix de marché** en USD (ou autre devise de cotation) et convertit les montants d'achat au taux de change historique du jour d'achat.

## Schéma de Base de Données

### Modèle `InvestmentAsset` (modifié)

Nouveaux champs ajoutés :
- `baseSymbol` : Symbole de base (ex: BTC, ETH, AAPL)
- `quoteSymbol` : Symbole de quote (ex: USD, EUR) - devise de cotation

### Modèle `Position` (étendu)

Champs existants :
- `quantity` : Quantité en base (ex: 2 BTC)
- `costBasis` : Coût unitaire en quote

Nouveaux champs :
- `paidAmount` : Montant payé dans la devise d'origine (ex: 500 EUR)
- `paidCurrency` : Devise d'origine (ex: EUR)
- `purchaseDate` : Date d'achat
- `fxRateToQuote` : Taux de change au moment de l'achat (paidCurrency -> quoteSymbol)

### Modèle `PriceSnapshot` (nouveau)

Pour tracer l'évolution des prix :
- `assetId` : ID de l'investissement
- `quoteCurrency` : Devise de cotation (USD, EUR, etc.)
- `price` : Prix au moment du snapshot
- `timestamp` : Date/heure du snapshot

## API Endpoint

### GET `/api/investments/{id}/metrics?quote=USD`

Retourne les métriques calculées pour un investissement.

**Paramètres :**
- `id` : ID de l'investissement
- `quote` : Devise de cotation (par défaut: USD)

**Réponse JSON :**
```json
{
  "investmentId": "clx1234567890",
  "investmentName": "Bitcoin",
  "baseSymbol": "BTC",
  "quoteSymbol": "USD",
  "buyPriceUsd": 25000.00,
  "currentPriceUsd": 88000.00,
  "valueUsd": 176000.00,
  "costUsd": 50000.00,
  "plUsd": 126000.00,
  "plPct": 252.00,
  "quantity": 2.0,
  "quoteCurrency": "USD",
  "positions": [
    {
      "id": "pos1234567890",
      "quantity": 2.0,
      "paidAmount": 500.00,
      "paidCurrency": "EUR",
      "purchaseDate": "2019-01-15T10:30:00.000Z",
      "fxRateToQuote": 1.14
    }
  ]
}
```

## Calculs Effectués

### 1. Prix Actuel du Marché
- Récupéré depuis CoinGecko via `getCurrentMarketPrice(baseSymbol, quoteSymbol)`
- Exemple : BTC/USD = 88000 USD

### 2. Coût d'Achat en USD
Pour chaque position :
```
cost_usd = paid_amount_eur * fx_eur_to_usd
```

Si `fxRateToQuote` n'est pas stocké, le système :
1. Récupère le taux de change historique depuis ExchangeRate API
2. Si indisponible, utilise le taux actuel (moins précis)

### 3. Prix d'Achat Moyen
```
buy_price_usd = total_cost_usd / total_quantity
```

### 4. Valeur Actuelle
```
current_value_usd = quantity * current_price_usd
```

### 5. Gain/Perte
```
pl_usd = current_value_usd - cost_usd
pl_pct = (pl_usd / cost_usd) * 100
```

## Exemple d'Utilisation

### Cas : Achat de Bitcoin en 2019

**Données d'entrée :**
- Achat en 2019 : quantité = 2 BTC
- Montant payé = 500 EUR
- Symbole suivi = BTCUSD (base=BTC, quote=USD)

**Calculs :**
1. Prix actuel BTCUSD : 88000 USD (depuis CoinGecko)
2. Taux de change EUR/USD au 15/01/2019 : 1.14
3. Coût en USD : 500 EUR × 1.14 = 570 USD
4. Prix d'achat unitaire USD : 570 USD / 2 BTC = 285 USD/BTC
5. Valeur actuelle USD : 2 BTC × 88000 USD = 176000 USD
6. Gain/Perte USD : 176000 - 570 = 175430 USD
7. Rendement : (175430 / 570) × 100 = 30777%

## Services Utilisés

### `lib/investment-metrics.ts`

- `getCurrentMarketPrice(baseSymbol, quoteSymbol)` : Récupère le prix actuel depuis CoinGecko
- `getHistoricalFxRate(fromCurrency, toCurrency, date)` : Récupère le taux de change historique
- `computeInvestmentMetrics(positions, baseSymbol, quoteSymbol)` : Calcule toutes les métriques

### APIs Externes

1. **CoinGecko** : Prix de marché des cryptos et métaux
   - Endpoint : `https://api.coingecko.com/api/v3/simple/price`
   - Gratuit jusqu'à 50 requêtes/minute

2. **ExchangeRate API** : Taux de change historiques
   - Endpoint : `https://api.exchangerate-api.com/v4/historical/{base}/{date}`
   - Gratuit jusqu'à 1500 requêtes/mois

## Migration des Données Existantes

Pour les positions existantes sans les nouveaux champs :
- `paidAmount` : Calculé depuis `costBasis * quantity`
- `paidCurrency` : Utilise `asset.currency` (par défaut EUR)
- `purchaseDate` : Utilise `createdAt`
- `fxRateToQuote` : Récupéré à la volée depuis l'API historique

## Prochaines Étapes

1. Mettre à jour l'interface pour utiliser `/api/investments/{id}/metrics`
2. Ajouter un formulaire pour saisir les transactions avec taux de change
3. Implémenter le stockage automatique de `PriceSnapshot` lors des mises à jour
4. Créer un graphique d'évolution basé sur `PriceSnapshot`




## Vue d'ensemble

Ce système calcule les métriques d'investissement en utilisant **strictement les prix de marché** en USD (ou autre devise de cotation) et convertit les montants d'achat au taux de change historique du jour d'achat.

## Schéma de Base de Données

### Modèle `InvestmentAsset` (modifié)

Nouveaux champs ajoutés :
- `baseSymbol` : Symbole de base (ex: BTC, ETH, AAPL)
- `quoteSymbol` : Symbole de quote (ex: USD, EUR) - devise de cotation

### Modèle `Position` (étendu)

Champs existants :
- `quantity` : Quantité en base (ex: 2 BTC)
- `costBasis` : Coût unitaire en quote

Nouveaux champs :
- `paidAmount` : Montant payé dans la devise d'origine (ex: 500 EUR)
- `paidCurrency` : Devise d'origine (ex: EUR)
- `purchaseDate` : Date d'achat
- `fxRateToQuote` : Taux de change au moment de l'achat (paidCurrency -> quoteSymbol)

### Modèle `PriceSnapshot` (nouveau)

Pour tracer l'évolution des prix :
- `assetId` : ID de l'investissement
- `quoteCurrency` : Devise de cotation (USD, EUR, etc.)
- `price` : Prix au moment du snapshot
- `timestamp` : Date/heure du snapshot

## API Endpoint

### GET `/api/investments/{id}/metrics?quote=USD`

Retourne les métriques calculées pour un investissement.

**Paramètres :**
- `id` : ID de l'investissement
- `quote` : Devise de cotation (par défaut: USD)

**Réponse JSON :**
```json
{
  "investmentId": "clx1234567890",
  "investmentName": "Bitcoin",
  "baseSymbol": "BTC",
  "quoteSymbol": "USD",
  "buyPriceUsd": 25000.00,
  "currentPriceUsd": 88000.00,
  "valueUsd": 176000.00,
  "costUsd": 50000.00,
  "plUsd": 126000.00,
  "plPct": 252.00,
  "quantity": 2.0,
  "quoteCurrency": "USD",
  "positions": [
    {
      "id": "pos1234567890",
      "quantity": 2.0,
      "paidAmount": 500.00,
      "paidCurrency": "EUR",
      "purchaseDate": "2019-01-15T10:30:00.000Z",
      "fxRateToQuote": 1.14
    }
  ]
}
```

## Calculs Effectués

### 1. Prix Actuel du Marché
- Récupéré depuis CoinGecko via `getCurrentMarketPrice(baseSymbol, quoteSymbol)`
- Exemple : BTC/USD = 88000 USD

### 2. Coût d'Achat en USD
Pour chaque position :
```
cost_usd = paid_amount_eur * fx_eur_to_usd
```

Si `fxRateToQuote` n'est pas stocké, le système :
1. Récupère le taux de change historique depuis ExchangeRate API
2. Si indisponible, utilise le taux actuel (moins précis)

### 3. Prix d'Achat Moyen
```
buy_price_usd = total_cost_usd / total_quantity
```

### 4. Valeur Actuelle
```
current_value_usd = quantity * current_price_usd
```

### 5. Gain/Perte
```
pl_usd = current_value_usd - cost_usd
pl_pct = (pl_usd / cost_usd) * 100
```

## Exemple d'Utilisation

### Cas : Achat de Bitcoin en 2019

**Données d'entrée :**
- Achat en 2019 : quantité = 2 BTC
- Montant payé = 500 EUR
- Symbole suivi = BTCUSD (base=BTC, quote=USD)

**Calculs :**
1. Prix actuel BTCUSD : 88000 USD (depuis CoinGecko)
2. Taux de change EUR/USD au 15/01/2019 : 1.14
3. Coût en USD : 500 EUR × 1.14 = 570 USD
4. Prix d'achat unitaire USD : 570 USD / 2 BTC = 285 USD/BTC
5. Valeur actuelle USD : 2 BTC × 88000 USD = 176000 USD
6. Gain/Perte USD : 176000 - 570 = 175430 USD
7. Rendement : (175430 / 570) × 100 = 30777%

## Services Utilisés

### `lib/investment-metrics.ts`

- `getCurrentMarketPrice(baseSymbol, quoteSymbol)` : Récupère le prix actuel depuis CoinGecko
- `getHistoricalFxRate(fromCurrency, toCurrency, date)` : Récupère le taux de change historique
- `computeInvestmentMetrics(positions, baseSymbol, quoteSymbol)` : Calcule toutes les métriques

### APIs Externes

1. **CoinGecko** : Prix de marché des cryptos et métaux
   - Endpoint : `https://api.coingecko.com/api/v3/simple/price`
   - Gratuit jusqu'à 50 requêtes/minute

2. **ExchangeRate API** : Taux de change historiques
   - Endpoint : `https://api.exchangerate-api.com/v4/historical/{base}/{date}`
   - Gratuit jusqu'à 1500 requêtes/mois

## Migration des Données Existantes

Pour les positions existantes sans les nouveaux champs :
- `paidAmount` : Calculé depuis `costBasis * quantity`
- `paidCurrency` : Utilise `asset.currency` (par défaut EUR)
- `purchaseDate` : Utilise `createdAt`
- `fxRateToQuote` : Récupéré à la volée depuis l'API historique

## Prochaines Étapes

1. Mettre à jour l'interface pour utiliser `/api/investments/{id}/metrics`
2. Ajouter un formulaire pour saisir les transactions avec taux de change
3. Implémenter le stockage automatique de `PriceSnapshot` lors des mises à jour
4. Créer un graphique d'évolution basé sur `PriceSnapshot`









