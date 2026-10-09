import type { AssetProfileFinancials as PrismaAssetProfileFinancials } from '@ghostfolio/prisma/browser';

export interface FinancialsRow {
  name: string;
  percent: number;
}

export interface AssetProfileFinancials extends Omit<
  PrismaAssetProfileFinancials,
  'earningsGeographyRows' | 'revenueShareRows'
> {
  earningsGeographyRows: FinancialsRow[];
  revenueShareRows: FinancialsRow[];
}
