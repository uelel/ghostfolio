-- CreateEnum
CREATE TYPE "FinancialsCurrency" AS ENUM ('EUR', 'USD');

-- CreateEnum
CREATE TYPE "FinancialsScale" AS ENUM ('B', 'M');

-- CreateTable
CREATE TABLE "AssetProfileFinancials" (
    "capex" DOUBLE PRECISION,
    "capexScale" "FinancialsScale",
    "cash" DOUBLE PRECISION,
    "cashScale" "FinancialsScale",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currency" "FinancialsCurrency",
    "currentDebt" DOUBLE PRECISION,
    "currentDebtScale" "FinancialsScale",
    "date" TIMESTAMP(3) NOT NULL,
    "debtRating" TEXT,
    "dividendYieldPercent" DOUBLE PRECISION,
    "dividendsPerShare" DOUBLE PRECISION,
    "earningsGeographyRows" JSONB,
    "id" TEXT NOT NULL,
    "longTermDebt" DOUBLE PRECISION,
    "longTermDebtScale" "FinancialsScale",
    "marketCap" DOUBLE PRECISION,
    "marketCapScale" "FinancialsScale",
    "netIncome" DOUBLE PRECISION,
    "netIncomeScale" "FinancialsScale",
    "netWorth" DOUBLE PRECISION,
    "netWorthScale" "FinancialsScale",
    "revenueShareRows" JSONB,
    "symbolProfileId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetProfileFinancials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetProfileFinancials_date_idx" ON "AssetProfileFinancials"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AssetProfileFinancials_symbolProfileId_date_key" ON "AssetProfileFinancials"("symbolProfileId", "date");

-- AddForeignKey
ALTER TABLE "AssetProfileFinancials" ADD CONSTRAINT "AssetProfileFinancials_symbolProfileId_fkey" FOREIGN KEY ("symbolProfileId") REFERENCES "SymbolProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
