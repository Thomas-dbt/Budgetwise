-- CreateTable
CREATE TABLE "CategoryKeyword" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "keyword" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CategoryKeyword_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CategoryKeyword_keyword_idx" ON "CategoryKeyword"("keyword");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryKeyword_categoryId_keyword_key" ON "CategoryKeyword"("categoryId", "keyword");
