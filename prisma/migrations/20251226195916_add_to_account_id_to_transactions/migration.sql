-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "toAccountId" TEXT;

-- AddForeignKey
-- Note: SQLite doesn't support adding foreign keys via ALTER TABLE, so we'll need to recreate the table
-- For now, we'll just add the column and Prisma will handle the relation

