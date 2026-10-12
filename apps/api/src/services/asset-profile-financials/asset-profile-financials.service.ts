import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { resetHours } from '@ghostfolio/common/helper';
import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';

import { Injectable } from '@nestjs/common';
import { AssetProfileFinancials, Prisma } from '@prisma/client';

@Injectable()
export class AssetProfileFinancialsService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async create({
    date,
    symbolProfileId
  }: {
    date: Date;
    symbolProfileId: string;
  }): Promise<AssetProfileFinancials> {
    return this.prismaService.assetProfileFinancials.create({
      data: {
        symbolProfileId,
        date: resetHours(date)
      }
    });
  }

  /**
   * Deletes the financials with the given id of an asset profile and returns
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
      await this.prismaService.assetProfileFinancials.deleteMany({
        where: {
          id,
          symbolProfileId
        }
      });

    return count > 0;
  }

  /**
   * Returns the financials of the given asset profile in ascending order by
   * date so recent snapshots appear as right-most columns
   */
  public async getFinancials({
    dataSource,
    symbol
  }: AssetProfileIdentifier): Promise<AssetProfileFinancials[]> {
    return this.prismaService.assetProfileFinancials.findMany({
      orderBy: [
        {
          date: 'asc'
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

  /**
   * Patches a subset of fields on a financials snapshot
   */
  public async update({
    data,
    id,
    symbolProfileId
  }: {
    data: Prisma.AssetProfileFinancialsUpdateInput;
    id: string;
    symbolProfileId: string;
  }): Promise<AssetProfileFinancials> {
    return this.prismaService.assetProfileFinancials.update({
      data,
      where: {
        id,
        symbolProfileId
      }
    });
  }
}
