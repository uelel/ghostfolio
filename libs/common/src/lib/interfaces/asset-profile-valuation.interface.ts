import type { AssetProfileValuation as PrismaAssetProfileValuation } from '@ghostfolio/prisma/browser';

export interface AssetProfileValuation extends Omit<
  PrismaAssetProfileValuation,
  'screenshot'
> {
  screenshot: string | null;
}
