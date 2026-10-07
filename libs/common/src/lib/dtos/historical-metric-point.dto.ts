import { IsNumber, Matches } from 'class-validator';

export class HistoricalMetricPointDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be a YYYY-MM-DD string'
  })
  date: string;

  @IsNumber()
  value: number;
}
