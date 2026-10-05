import {
  AssetClass,
  AssetSubClass,
  DataGatheringFrequency,
  DataSource
} from '@ghostfolio/prisma/enums';

import { Country } from './country.interface';
import { DataProviderInfo } from './data-provider-info.interface';
import { Holding } from './holding.interface';
import { ScraperConfiguration } from './scraper-configuration.interface';
import { Sector } from './sector.interface';

export interface EnhancedAssetProfile {
  activitiesCount: number;
  assetClass: AssetClass;
  assetSubClass: AssetSubClass;
  businessDescription?: string;
  comment?: string;
  competitiveAdvantages?: string;
  countries: Country[];
  createdAt: Date;
  currency?: string;
  cusip?: string;
  dataGatheringFrequency?: DataGatheringFrequency;
  dataProviderInfo?: DataProviderInfo;
  dataSource: DataSource;
  dateOfFirstActivity?: Date;
  figi?: string;
  figiComposite?: string;
  figiShareClass?: string;
  holdings: Holding[];
  id: string;
  isActive: boolean;
  isin?: string;
  name?: string;
  risks?: string;
  scraperConfiguration?: ScraperConfiguration;
  sectors: Sector[];
  symbol: string;
  symbolMapping?: { [key: string]: string };
  tailwinds?: string;
  updatedAt: Date;
  url?: string;
  userId?: string;
  watchedByCount?: number;
}
