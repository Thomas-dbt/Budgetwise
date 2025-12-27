/*
  Warnings:

  - You are about to drop the column `manualPriceEnabled` on the `InvestmentAsset` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[calendarSubscriptionToken]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Category` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN "calendarSubscriptionToken" TEXT;

-- CreateTable
CREATE TABLE "SubCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriceSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "quoteCurrency" TEXT NOT NULL,
    "price" DECIMAL NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceSnapshot_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "InvestmentAsset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CalendarSync" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "calendarName" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" DATETIME,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" DATETIME,
    "externalEventIdMap" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CalendarSync_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RealEstateInvestment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "propertyType" TEXT,
    "purchaseDate" DATETIME,
    "purchasePrice" DECIMAL NOT NULL,
    "notaryFees" DECIMAL NOT NULL DEFAULT 0,
    "initialWorks" DECIMAL NOT NULL DEFAULT 0,
    "downPayment" DECIMAL NOT NULL,
    "loanMonthlyPayment" DECIMAL NOT NULL DEFAULT 0,
    "loanInsuranceMonthly" DECIMAL NOT NULL DEFAULT 0,
    "rentMonthly" DECIMAL NOT NULL,
    "vacancyRatePct" DECIMAL NOT NULL DEFAULT 5,
    "nonRecoverableChargesMonthly" DECIMAL NOT NULL DEFAULT 0,
    "propertyTaxYearly" DECIMAL NOT NULL DEFAULT 0,
    "insuranceYearly" DECIMAL NOT NULL DEFAULT 0,
    "maintenanceReserveMonthly" DECIMAL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RealEstateInvestment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CalendarEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "recurring" TEXT,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "notifyByEmail" BOOLEAN NOT NULL DEFAULT false,
    "emailReminderDaysBefore" INTEGER,
    "categoryId" TEXT,
    "subCategoryId" TEXT,
    "accountId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CalendarEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CalendarEvent_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CalendarEvent_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "SubCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CalendarEvent_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CalendarEvent" ("accountId", "amount", "categoryId", "confirmed", "createdAt", "dueDate", "emailReminderDaysBefore", "id", "notifyByEmail", "recurring", "title", "type", "userId") SELECT "accountId", "amount", "categoryId", "confirmed", "createdAt", "dueDate", "emailReminderDaysBefore", "id", "notifyByEmail", "recurring", "title", "type", "userId" FROM "CalendarEvent";
DROP TABLE "CalendarEvent";
ALTER TABLE "new_CalendarEvent" RENAME TO "CalendarEvent";
CREATE TABLE "new_Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "emoji" TEXT,
    "userId" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Category" ("emoji", "id", "name") SELECT "emoji", "id", "name" FROM "Category";
DROP TABLE "Category";
ALTER TABLE "new_Category" RENAME TO "Category";
CREATE UNIQUE INDEX "Category_userId_name_key" ON "Category"("userId", "name");
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
    "baseSymbol" TEXT,
    "quoteSymbol" TEXT,
    "baseAmount" DECIMAL,
    "annualRate" DECIMAL,
    "capitalizationMode" TEXT,
    "startDate" DATETIME,
    "manualPrice" DECIMAL,
    "externalId" TEXT,
    "importBatchId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'stock',
    "accountId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvestmentAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InvestmentAsset_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_InvestmentAsset" ("amountInvested", "annualRate", "baseAmount", "capitalizationMode", "category", "comment", "createdAt", "currency", "currentPrice", "currentValue", "externalId", "id", "importBatchId", "kind", "lastValuationDate", "manualPrice", "name", "platform", "priceProvider", "quantity", "readOnly", "source", "startDate", "subCategory", "symbol", "tradingViewSymbol", "updatedAt", "userId", "valuationMode") SELECT "amountInvested", "annualRate", "baseAmount", "capitalizationMode", "category", "comment", "createdAt", "currency", "currentPrice", "currentValue", "externalId", "id", "importBatchId", "kind", "lastValuationDate", "manualPrice", "name", "platform", "priceProvider", "quantity", "readOnly", "source", "startDate", "subCategory", "symbol", "tradingViewSymbol", "updatedAt", "userId", "valuationMode" FROM "InvestmentAsset";
DROP TABLE "InvestmentAsset";
ALTER TABLE "new_InvestmentAsset" RENAME TO "InvestmentAsset";
CREATE TABLE "new_Position" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "costBasis" DECIMAL NOT NULL,
    "paidAmount" DECIMAL,
    "paidCurrency" TEXT,
    "purchaseDate" DATETIME,
    "fxRateToQuote" DECIMAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Position_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "InvestmentAsset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Position" ("assetId", "costBasis", "createdAt", "id", "quantity") SELECT "assetId", "costBasis", "createdAt", "id", "quantity" FROM "Position";
DROP TABLE "Position";
ALTER TABLE "new_Position" RENAME TO "Position";
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "toAccountId" TEXT,
    "amount" DECIMAL NOT NULL,
    "type" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "description" TEXT,
    "categoryId" TEXT,
    "subCategoryId" TEXT,
    "attachment" TEXT,
    "pending" BOOLEAN NOT NULL DEFAULT false,
    "transferGroupId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "SubCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("accountId", "amount", "attachment", "categoryId", "createdAt", "date", "description", "id", "pending", "toAccountId", "transferGroupId", "type") SELECT "accountId", "amount", "attachment", "categoryId", "createdAt", "date", "description", "id", "pending", "toAccountId", "transferGroupId", "type" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "SubCategory_categoryId_name_key" ON "SubCategory"("categoryId", "name");

-- CreateIndex
CREATE INDEX "PriceSnapshot_assetId_timestamp_idx" ON "PriceSnapshot"("assetId", "timestamp");

-- CreateIndex
CREATE INDEX "PriceSnapshot_assetId_quoteCurrency_timestamp_idx" ON "PriceSnapshot"("assetId", "quoteCurrency", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarSync_userId_provider_calendarId_key" ON "CalendarSync"("userId", "provider", "calendarId");

-- CreateIndex
CREATE UNIQUE INDEX "User_calendarSubscriptionToken_key" ON "User"("calendarSubscriptionToken");
