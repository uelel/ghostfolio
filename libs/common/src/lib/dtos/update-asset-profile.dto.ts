import {
  BULLET_LIST_MAXIMUM_LENGTH,
  BUSINESS_DESCRIPTION_MAXIMUM_LENGTH,
  COMMENT_MAXIMUM_LENGTH,
  SYMBOL_MAXIMUM_LENGTH
} from '@ghostfolio/common/config';
import { IsCurrencyCode } from '@ghostfolio/common/validators/is-currency-code';
import type { Prisma } from '@ghostfolio/prisma/browser';
import {
  AssetClass,
  AssetSubClass,
  DataGatheringFrequency,
  DataSource
} from '@ghostfolio/prisma/enums';

import { Type } from 'class-transformer';
import {
  IsArray,
  IsBase64,
  IsBoolean,
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested
} from 'class-validator';

import { CountryDto } from './country.dto';
import { HistoricalMetricPointDto } from './historical-metric-point.dto';
import { HoldingDto } from './holding.dto';
import { ScraperConfigurationDto } from './scraper-configuration.dto';
import { SectorDto } from './sector.dto';

export class UpdateAssetProfileDto {
  @IsEnum(AssetClass)
  @IsOptional()
  assetClass?: AssetClass;

  @IsEnum(AssetSubClass)
  @IsOptional()
  assetSubClass?: AssetSubClass;

  @IsOptional()
  @IsString()
  @MaxLength(BUSINESS_DESCRIPTION_MAXIMUM_LENGTH)
  businessDescription?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(COMMENT_MAXIMUM_LENGTH)
  comment?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(BULLET_LIST_MAXIMUM_LENGTH)
  competitiveAdvantages?: string | null;

  @IsArray()
  @IsOptional()
  @Type(() => CountryDto)
  @ValidateNested({ each: true })
  countries?: Prisma.InputJsonArray;

  @IsCurrencyCode()
  @IsOptional()
  currency?: string;

  @IsEnum(DataGatheringFrequency)
  @IsOptional()
  dataGatheringFrequency?: DataGatheringFrequency;

  @IsEnum(DataSource)
  @IsOptional()
  dataSource?: DataSource;

  @IsArray()
  @IsOptional()
  @Type(() => HistoricalMetricPointDto)
  @ValidateNested({ each: true })
  historicalDps?: Prisma.InputJsonArray;

  @IsArray()
  @IsOptional()
  @Type(() => HistoricalMetricPointDto)
  @ValidateNested({ each: true })
  historicalEps?: Prisma.InputJsonArray;

  @IsArray()
  @IsOptional()
  @Type(() => HistoricalMetricPointDto)
  @ValidateNested({ each: true })
  historicalPayoutRatio?: Prisma.InputJsonArray;

  @IsArray()
  @IsOptional()
  @Type(() => HoldingDto)
  @ValidateNested({ each: true })
  holdings?: Prisma.InputJsonArray;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(BULLET_LIST_MAXIMUM_LENGTH)
  risks?: string | null;

  @IsObject()
  @IsOptional()
  @Type(() => ScraperConfigurationDto)
  @ValidateNested()
  scraperConfiguration?: Prisma.InputJsonObject;

  @IsArray()
  @IsOptional()
  @Type(() => SectorDto)
  @ValidateNested({ each: true })
  sectors?: Prisma.InputJsonArray;

  /**
   * A screenshot of the shares outstanding chart/table, base64-encoded.
   * Capped at roughly 3 MB decoded.
   */
  @IsBase64()
  @IsOptional()
  @MaxLength(4_000_000)
  sharesOutstandingScreenshot?: string | null;

  @IsIn(['image/png', 'image/jpeg', 'image/webp'])
  @IsOptional()
  sharesOutstandingScreenshotContentType?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(SYMBOL_MAXIMUM_LENGTH)
  symbol?: string;

  @IsObject()
  @IsOptional()
  symbolMapping?: {
    [dataProvider: string]: string;
  };

  @IsOptional()
  @IsString()
  @MaxLength(BULLET_LIST_MAXIMUM_LENGTH)
  tailwinds?: string | null;

  @IsOptional()
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true
  })
  url?: string | null;
}
