import { IsAfter1970Constraint } from '@ghostfolio/common/validator-constraints/is-after-1970';

import { IsISO8601, Validate } from 'class-validator';

export class CreateAssetProfileFinancialsDto {
  /**
   * The date of the financials snapshot (end of fiscal year).
   */
  @IsISO8601()
  @Validate(IsAfter1970Constraint)
  date: string;
}
