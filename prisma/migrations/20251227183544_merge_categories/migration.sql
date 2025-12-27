/*
  Warnings:

  - You are about to drop the `SubCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `subCategoryId` on the `CalendarEvent` table. All the data in the column will be lost.
  - You are about to drop the column `subCategoryId` on the `Transaction` table. All the data in the column will be lost.

  Custom Migration to preserve data:
  - Migrate SubCategories to Category table (as children).
  - Migrate Transactions/Events to point to the correct Category ID.
*/

PRAGMA foreign_keys=OFF;

-- 1. Migrate Category
CREATE TABLE "new_Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "emoji" TEXT,
    "parentId" TEXT,
    "userId" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Copy existing Categories
INSERT INTO "new_Category" ("id", "name", "emoji", "userId", "isSystem")
SELECT "id", "name", "emoji", "userId", "isSystem" FROM "Category";

-- Copy SubCategories into Category (setting parentId and inferring userId)
INSERT INTO "new_Category" ("id", "name", "parentId", "userId", "isSystem")
SELECT s."id", s."name", s."categoryId", c."userId", false
FROM "SubCategory" s
JOIN "Category" c ON s."categoryId" = c."id";

DROP TABLE "Category";
ALTER TABLE "new_Category" RENAME TO "Category";
CREATE UNIQUE INDEX "Category_userId_name_key" ON "Category"("userId", "name");


-- 2. Migrate CalendarEvent
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
    "accountId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CalendarEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CalendarEvent_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CalendarEvent_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Copy events, mapping subCategoryId to categoryId if present
INSERT INTO "new_CalendarEvent" (
    "id", "userId", "title", "type", "amount", "dueDate", "recurring", 
    "confirmed", "notifyByEmail", "emailReminderDaysBefore", "categoryId", "accountId", "createdAt"
)
SELECT 
    "id", "userId", "title", "type", "amount", "dueDate", "recurring", 
    "confirmed", "notifyByEmail", "emailReminderDaysBefore", 
    COALESCE("subCategoryId", "categoryId"), -- Use subCategoryId as categoryId if it exists
    "accountId", "createdAt"
FROM "CalendarEvent";

DROP TABLE "CalendarEvent";
ALTER TABLE "new_CalendarEvent" RENAME TO "CalendarEvent";


-- 3. Migrate Transaction
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
    CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Copy transactions, mapping subCategoryId to categoryId if present
INSERT INTO "new_Transaction" (
    "id", "accountId", "toAccountId", "amount", "type", "date", 
    "description", "categoryId", "attachment", "pending", "transferGroupId", "createdAt"
)
SELECT 
    "id", "accountId", "toAccountId", "amount", "type", "date", 
    "description", 
    COALESCE("subCategoryId", "categoryId"), -- Use subCategoryId as categoryId if it exists
    "attachment", "pending", "transferGroupId", "createdAt"
FROM "Transaction";

DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";

-- 4. Cleanup
DROP TABLE "SubCategory";

PRAGMA foreign_keys=ON;

