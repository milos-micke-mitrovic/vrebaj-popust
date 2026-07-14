-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "store" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "originalPrice" INTEGER NOT NULL,
    "salePrice" INTEGER NOT NULL,
    "discountPercent" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "imageUrl" TEXT,
    "sizes" TEXT NOT NULL DEFAULT '[]',
    "description" TEXT,
    "detailImageUrl" TEXT,
    "categories" TEXT NOT NULL DEFAULT '[]',
    "gender" TEXT NOT NULL DEFAULT 'unisex',
    "scrapedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detailsScrapedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ScrapeRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "store" TEXT NOT NULL,
    "totalScraped" INTEGER NOT NULL,
    "filteredCount" INTEGER NOT NULL,
    "errors" TEXT NOT NULL DEFAULT '[]',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME
);

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Deal_url_key" ON "Deal"("url");

-- CreateIndex
CREATE INDEX "Deal_store_idx" ON "Deal"("store");

-- CreateIndex
CREATE INDEX "Deal_gender_idx" ON "Deal"("gender");

-- CreateIndex
CREATE INDEX "Deal_discountPercent_idx" ON "Deal"("discountPercent");

-- CreateIndex
CREATE INDEX "Deal_brand_idx" ON "Deal"("brand");

-- CreateIndex
CREATE INDEX "Deal_salePrice_idx" ON "Deal"("salePrice");

