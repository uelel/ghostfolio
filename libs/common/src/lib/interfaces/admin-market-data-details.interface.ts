import type { AssetProfileSplit, MarketData } from '@ghostfolio/prisma/browser';

import { AssetProfileFinancials } from './asset-profile-financials.interface';
import { AssetProfileValuation } from './asset-profile-valuation.interface';
import { EnhancedAssetProfile } from './enhanced-asset-profile.interface';

export interface AdminMarketDataDetails {
  assetProfile: Partial<EnhancedAssetProfile>;
  financials: AssetProfileFinancials[];
  marketData: MarketData[];
  splits: AssetProfileSplit[];
  valuations: AssetProfileValuation[];
}
