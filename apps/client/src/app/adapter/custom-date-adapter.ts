import { getDateFormatString } from '@ghostfolio/common/helper';

import { inject, Service } from '@angular/core';
import { MAT_DATE_LOCALE, NativeDateAdapter } from '@angular/material/core';
import { addYears, format, getYear, isValid, parse } from 'date-fns';

/**
 * Formats accepted as a fallback when a typed value does not match the
 * locale's own date format, so that a day/month/year value such as
 * "7.3.2026" (7 March 2026) is always understood regardless of locale.
 */
const FALLBACK_DATE_FORMATS = ['d.M.yyyy', 'd/M/yyyy', 'd-M-yyyy'];

@Service({ autoProvided: false })
export class CustomDateAdapter extends NativeDateAdapter {
  public override locale = inject<string>(MAT_DATE_LOCALE);

  /**
   * Formats a date as a string
   */
  public override format(aDate: Date): string {
    return format(aDate, getDateFormatString(this.locale));
  }

  /**
   * Sets the first day of the week to Monday
   */
  public override getFirstDayOfWeek(): number {
    return 1;
  }

  /**
   * Parses a date from a provided value
   */
  public override parse(aValue: string): Date {
    let date = parse(aValue, getDateFormatString(this.locale), new Date());

    for (const fallbackFormat of FALLBACK_DATE_FORMATS) {
      if (isValid(date)) {
        break;
      }

      date = parse(aValue, fallbackFormat, new Date());
    }

    if (getYear(date) < 1900) {
      if (getYear(date) > Number(format(new Date(), 'yy')) + 1) {
        date = addYears(date, 1900);
      } else {
        date = addYears(date, 2000);
      }
    }

    return date;
  }
}
