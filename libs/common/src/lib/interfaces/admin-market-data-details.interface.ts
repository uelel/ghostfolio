import type { AssetProfileSplit, MarketData } from '@ghostfolio/prisma/browser';

import { AssetProfileValuation } from './asset-profile-valuation.interface';
import { EnhancedAssetProfile } from './enhanced-asset-profile.interface';

export interface AdminMarketDataDetails {
  assetProfile: Partial<EnhancedAssetProfile>;
  marketData: MarketData[];
  splits: AssetProfileSplit[];
  valuations: AssetProfileValuation[];
}
