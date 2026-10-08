import { IsAfter1970Constraint } from '@ghostfolio/common/validator-constraints/is-after-1970';
import { ValuationCategory } from '@ghostfolio/prisma/enums';

import {
  IsBase64,
  IsEnum,
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  MaxLength,
  Validate
} from 'class-validator';

export class CreateAssetProfileValuationDto {
  @IsEnum(ValuationCategory)
  category: ValuationCategory;

  /**
   * The date of the valuation snapshot.
   */
  @IsISO8601()
  @Validate(IsAfter1970Constraint)
  date: string;

  @IsNumber()
  @IsOptional()
  dividendYieldPercent?: number;

  @IsNumber()
  @IsOptional()
  peRatio?: number;

  /**
   * A screenshot of the valuation chart, base64-encoded. Capped at roughly
   * 3 MB decoded.
   */
  @IsBase64()
  @IsOptional()
  @MaxLength(4_000_000)
  screenshot?: string;

  @IsIn(['image/png', 'image/jpeg', 'image/webp'])
  @IsOptional()
  screenshotContentType?: string;
}
