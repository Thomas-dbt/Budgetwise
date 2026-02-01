/*
  Warnings:

  - You are about to drop the `TransactionSplit` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "TransactionSplit_categoryId_idx";

-- DropIndex
DROP INDEX "TransactionSplit_transactionId_idx";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN "icon" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "pinResetToken" TEXT;
ALTER TABLE "User" ADD COLUMN "pinResetTokenExpires" DATETIME;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "TransactionSplit";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "toAccountId" TEXT,
    "amount" DECIMAL NOT NULL,
    "type" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "description" TEXT,
    "categoryId" TEXT,
    "attachment" TEXT,
    "pending" BOOLEAN NOT NULL DEFAULT false,
    "transferGroupId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hasSplits" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Transaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("accountId", "amount", "attachment", "categoryId", "createdAt", "date", "description", "id", "pending", "toAccountId", "transferGroupId", "type") SELECT "accountId", "amount", "attachment", "categoryId", "createdAt", "date", "description", "id", "pending", "toAccountId", "transferGroupId", "type" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE INDEX "Transaction_accountId_idx" ON "Transaction"("accountId");
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");
CREATE INDEX "Transaction_categoryId_idx" ON "Transaction"("categoryId");
CREATE INDEX "Transaction_accountId_date_idx" ON "Transaction"("accountId", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
