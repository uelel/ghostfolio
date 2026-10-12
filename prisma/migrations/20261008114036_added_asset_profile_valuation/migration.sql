-- CreateEnum
CREATE TYPE "ValuationCategory" AS ENUM ('FAIRLY_VALUED', 'OVERVALUED', 'UNDERVALUED');

-- CreateTable
CREATE TABLE "AssetProfileValuation" (
    "category" "ValuationCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date" TIMESTAMP(3) NOT NULL,
    "dividendYieldPercent" DOUBLE PRECISION,
    "id" TEXT NOT NULL,
    "peRatio" DOUBLE PRECISION,
    "screenshot" BYTEA,
    "screenshotContentType" TEXT,
    "symbolProfileId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetProfileValuation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetProfileValuation_date_idx" ON "AssetProfileValuation"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AssetProfileValuation_symbolProfileId_date_key" ON "AssetProfileValuation"("symbolProfileId", "date");

-- AddForeignKey
ALTER TABLE "AssetProfileValuation" ADD CONSTRAINT "AssetProfileValuation_symbolProfileId_fkey" FOREIGN KEY ("symbolProfileId") REFERENCES "SymbolProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
