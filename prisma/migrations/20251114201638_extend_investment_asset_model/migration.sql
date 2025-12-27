-- Migration pour étendre le modèle InvestmentAsset selon le cahier des charges
-- SQLite nécessite de recréer la table pour ajouter des colonnes avec valeurs par défaut

PRAGMA foreign_keys=OFF;
PRAGMA defer_foreign_keys=ON;

-- Créer la nouvelle table avec tous les champs
CREATE TABLE "new_InvestmentAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT,
    "category" TEXT NOT NULL DEFAULT 'Action',
    "subCategory" TEXT,
    "platform" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "comment" TEXT,
    "valuationMode" TEXT NOT NULL DEFAULT 'marché',
    "readOnly" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "quantity" DECIMAL NOT NULL DEFAULT 1,
    "currentPrice" DECIMAL,
    "currentValue" DECIMAL NOT NULL DEFAULT 0,
    "amountInvested" DECIMAL,
    "lastValuationDate" DATETIME,
    "tradingViewSymbol" TEXT,
    "priceProvider" TEXT,
    "baseAmount" DECIMAL,
    "annualRate" DECIMAL,
    "capitalizationMode" TEXT,
    "startDate" DATETIME,
    "manualPrice" DECIMAL,
    "externalId" TEXT,
    "importBatchId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'stock',
    "manualPriceEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvestmentAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Migrer les données existantes avec conversion
INSERT INTO "new_InvestmentAsset" (
    "id", "userId", "name", "symbol", "kind", "tradingViewSymbol", 
    "manualPriceEnabled", "manualPrice", "category", "valuationMode", 
    "source", "currentPrice", "quantity", "createdAt", "updatedAt"
)
SELECT 
    "id",
    "userId",
    COALESCE("name", "symbol", 'Investissement') as "name",
    "symbol",
    COALESCE("kind", 'stock') as "kind",
    "tradingViewSymbol",
    "manualPriceEnabled",
    "manualPrice",
    CASE 
        WHEN "kind" = 'stock' THEN 'Action'
        WHEN "kind" = 'etf' THEN 'ETF'
        WHEN "kind" = 'crypto' THEN 'Crypto'
        ELSE 'Action'
    END as "category",
    CASE 
        WHEN "manualPriceEnabled" = 1 THEN 'manuel'
        ELSE 'marché'
    END as "valuationMode",
    CASE 
        WHEN "manualPriceEnabled" = 1 THEN 'manuel'
        WHEN "tradingViewSymbol" IS NOT NULL THEN 'tradingview'
        ELSE 'yahoo_finance'
    END as "source",
    CASE 
        WHEN "manualPriceEnabled" = 1 THEN "manualPrice"
        ELSE NULL
    END as "currentPrice",
    1 as "quantity",
    CURRENT_TIMESTAMP as "createdAt",
    CURRENT_TIMESTAMP as "updatedAt"
FROM "InvestmentAsset";

-- Supprimer l'ancienne table et renommer la nouvelle
DROP TABLE "InvestmentAsset";
ALTER TABLE "new_InvestmentAsset" RENAME TO "InvestmentAsset";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

