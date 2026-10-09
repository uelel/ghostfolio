import { IsAfter1970Constraint } from '@ghostfolio/common/validator-constraints/is-after-1970';
import { FinancialsCurrency, FinancialsScale } from '@ghostfolio/prisma/enums';

import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  Validate
} from 'class-validator';

export class FinancialsRowDto {
  @IsString()
  name: string;

  @IsNumber()
  percent: number;
}

export class UpdateAssetProfileFinancialsDto {
  @IsNumber()
  @IsOptional()
  capex?: number | null;

  @IsEnum(FinancialsScale)
  @IsOptional()
  capexScale?: FinancialsScale | null;

  @IsNumber()
  @IsOptional()
  cash?: number | null;

  @IsEnum(FinancialsScale)
  @IsOptional()
  cashScale?: FinancialsScale | null;

  @IsEnum(FinancialsCurrency)
  @IsOptional()
  currency?: FinancialsCurrency | null;

  @IsNumber()
  @IsOptional()
  currentDebt?: number | null;

  @IsEnum(FinancialsScale)
  @IsOptional()
  currentDebtScale?: FinancialsScale | null;

  @IsISO8601()
  @IsOptional()
  @Validate(IsAfter1970Constraint)
  date?: string;

  @IsOptional()
  @IsString()
  debtRating?: string | null;

  @IsNumber()
  @IsOptional()
  dividendYieldPercent?: number | null;

  @IsNumber()
  @IsOptional()
  dividendsPerShare?: number | null;

  @IsArray()
  @IsOptional()
  @Type(() => FinancialsRowDto)
  @ValidateNested({ each: true })
  earningsGeographyRows?: FinancialsRowDto[];

  @IsNumber()
  @IsOptional()
  longTermDebt?: number | null;

  @IsEnum(FinancialsScale)
  @IsOptional()
  longTermDebtScale?: FinancialsScale | null;

  @IsNumber()
  @IsOptional()
  marketCap?: number | null;

  @IsEnum(FinancialsScale)
  @IsOptional()
  marketCapScale?: FinancialsScale | null;

  @IsNumber()
  @IsOptional()
  netIncome?: number | null;

  @IsEnum(FinancialsScale)
  @IsOptional()
  netIncomeScale?: FinancialsScale | null;

  @IsNumber()
  @IsOptional()
  netWorth?: number | null;

  @IsEnum(FinancialsScale)
  @IsOptional()
  netWorthScale?: FinancialsScale | null;

  @IsArray()
  @IsOptional()
  @Type(() => FinancialsRowDto)
  @ValidateNested({ each: true })
  revenueShareRows?: FinancialsRowDto[];
}
