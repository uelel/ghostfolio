import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { resetHours } from '@ghostfolio/common/helper';
import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';

import { Injectable } from '@nestjs/common';
import { AssetProfileValuation, ValuationCategory } from '@prisma/client';

@Injectable()
export class AssetProfileValuationService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async create({
    category,
    date,
    dividendYieldPercent,
    peRatio,
    screenshot,
    screenshotContentType,
    symbolProfileId
  }: {
    category: ValuationCategory;
    date: Date;
    dividendYieldPercent?: number;
    peRatio?: number;
    screenshot?: Buffer;
    screenshotContentType?: string;
    symbolProfileId: string;
  }): Promise<AssetProfileValuation> {
    return this.prismaService.assetProfileValuation.create({
      data: {
        category,
        dividendYieldPercent,
        peRatio,
        screenshotContentType,
        symbolProfileId,
        date: resetHours(date),
        screenshot: screenshot ? new Uint8Array(screenshot) : undefined
      }
    });
  }

  /**
   * Deletes the valuation with the given id of an asset profile and returns
   * whether it existed
   */
  public async deleteById({
    id,
    symbolProfileId
  }: {
    id: string;
    symbolProfileId: string;
  }) {
    const { count } =
      await this.prismaService.assetProfileValuation.deleteMany({
        where: {
          id,
          symbolProfileId
        }
      });

    return count > 0;
  }

  /**
   * Returns the valuations of the given asset profile in descending order by
   * date
   */
  public async getValuations({
    dataSource,
    symbol
  }: AssetProfileIdentifier): Promise<AssetProfileValuation[]> {
    return this.prismaService.assetProfileValuation.findMany({
      orderBy: [
        {
          date: 'desc'
        }
      ],
      where: {
        symbolProfile: {
          dataSource,
          symbol
        }
      }
    });
  }
}
