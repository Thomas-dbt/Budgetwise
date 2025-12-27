-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_InvestmentAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT,
    "tradingViewSymbol" TEXT,
    "manualPriceEnabled" BOOLEAN NOT NULL DEFAULT false,
    "manualPrice" DECIMAL,
    CONSTRAINT "InvestmentAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_InvestmentAsset" ("id", "kind", "name", "symbol", "tradingViewSymbol", "userId") SELECT "id", "kind", "name", "symbol", "tradingViewSymbol", "userId" FROM "InvestmentAsset";
DROP TABLE "InvestmentAsset";
ALTER TABLE "new_InvestmentAsset" RENAME TO "InvestmentAsset";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
