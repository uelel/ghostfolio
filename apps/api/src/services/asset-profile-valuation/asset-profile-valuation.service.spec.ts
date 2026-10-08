import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';

import { AssetProfileValuation, DataSource } from '@prisma/client';

import { AssetProfileValuationService } from './asset-profile-valuation.service';

describe('AssetProfileValuationService', () => {
  let assetProfileValuationService: AssetProfileValuationService;
  let create: jest.Mock;
  let deleteMany: jest.Mock;
  let findMany: jest.Mock;

  beforeEach(() => {
    create = jest.fn();
    deleteMany = jest.fn();
    findMany = jest.fn();

    assetProfileValuationService = new AssetProfileValuationService({
      assetProfileValuation: { create, deleteMany, findMany }
    } as unknown as PrismaService);
  });

  describe('create', () => {
    it('normalizes the date and converts the screenshot to bytes before persisting it', async () => {
      const date = new Date('2024-06-15T18:30:00.000Z');
      const normalizedDate = new Date('2024-06-15T00:00:00.000Z');
      const screenshot = Buffer.from('fake-image-data');

      await assetProfileValuationService.create({
        date,
        screenshot,
        category: 'UNDERVALUED',
        dividendYieldPercent: 3.2,
        peRatio: 12.5,
        screenshotContentType: 'image/png',
        symbolProfileId: 'profile-id'
      });

      expect(create).toHaveBeenCalledWith({
        data: {
          category: 'UNDERVALUED',
          dividendYieldPercent: 3.2,
          peRatio: 12.5,
          screenshotContentType: 'image/png',
          symbolProfileId: 'profile-id',
          date: normalizedDate,
          screenshot: new Uint8Array(screenshot)
        }
      });
    });

    it('omits the screenshot when none is provided', async () => {
      const date = new Date('2024-06-15T00:00:00.000Z');

      await assetProfileValuationService.create({
        date,
        category: 'FAIRLY_VALUED',
        symbolProfileId: 'profile-id'
      });

      expect(create).toHaveBeenCalledWith({
        data: {
          category: 'FAIRLY_VALUED',
          dividendYieldPercent: undefined,
          peRatio: undefined,
          screenshotContentType: undefined,
          symbolProfileId: 'profile-id',
          date,
          screenshot: undefined
        }
      });
    });
  });

  describe('deleteById', () => {
    it('scopes deletion by valuation and asset profile identifiers', async () => {
      deleteMany.mockResolvedValue({ count: 1 });

      const result = await assetProfileValuationService.deleteById({
        id: 'valuation-id',
        symbolProfileId: 'profile-id'
      });

      expect(result).toBe(true);
      expect(deleteMany).toHaveBeenCalledWith({
        where: {
          id: 'valuation-id',
          symbolProfileId: 'profile-id'
        }
      });
    });

    it('returns false when the valuation belongs to another asset profile', async () => {
      deleteMany.mockResolvedValue({ count: 0 });

      const result = await assetProfileValuationService.deleteById({
        id: 'valuation-id',
        symbolProfileId: 'other-profile-id'
      });

      expect(result).toBe(false);
    });
  });

  describe('getValuations', () => {
    it('filters by asset profile and orders valuations by date descending', async () => {
      const valuations = [
        createStoredValuation('2021-01-01'),
        createStoredValuation('2020-01-01')
      ];
      findMany.mockResolvedValue(valuations);

      const result = await assetProfileValuationService.getValuations({
        dataSource: DataSource.YAHOO,
        symbol: 'AAPL'
      });

      expect(result).toBe(valuations);
      expect(findMany).toHaveBeenCalledWith({
        orderBy: [{ date: 'desc' }],
        where: {
          symbolProfile: {
            dataSource: DataSource.YAHOO,
            symbol: 'AAPL'
          }
        }
      });
    });
  });
});

function createStoredValuation(date: string): AssetProfileValuation {
  const valuationDate = new Date(date);

  return {
    category: 'FAIRLY_VALUED',
    createdAt: valuationDate,
    date: valuationDate,
    dividendYieldPercent: null,
    id: `${date}-valuation`,
    peRatio: null,
    screenshot: null,
    screenshotContentType: null,
    symbolProfileId: 'aapl-profile',
    updatedAt: valuationDate
  };
}
