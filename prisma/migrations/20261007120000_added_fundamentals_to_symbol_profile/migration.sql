-- AlterTable
ALTER TABLE "SymbolProfile" ADD COLUMN "historicalDps" JSONB DEFAULT '[]';
ALTER TABLE "SymbolProfile" ADD COLUMN "historicalEps" JSONB DEFAULT '[]';
ALTER TABLE "SymbolProfile" ADD COLUMN "historicalPayoutRatio" JSONB DEFAULT '[]';
