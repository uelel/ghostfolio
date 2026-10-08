import { ActivitiesService } from '@ghostfolio/api/app/activities/activities.service';
import { PortfolioChangedEvent } from '@ghostfolio/api/events/portfolio-changed.event';
import { AssetProfileSplitService } from '@ghostfolio/api/services/asset-profile-split/asset-profile-split.service';
import { AssetProfileValuationService } from '@ghostfolio/api/services/asset-profile-valuation/asset-profile-valuation.service';
import { DataGatheringService } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.service';

import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AssetProfileSplit, AssetProfileValuation, DataSource } from '@prisma/client';

import { AssetProfilesService } from './asset-profiles.service';

describe('AssetProfilesService', () => {
  let assetProfilesService: AssetProfilesService;
  let createValuation: jest.Mock;
  let deleteById: jest.Mock;
  let deleteValuationById: jest.Mock;
  let emit: jest.Mock;
  let finished: jest.Mock;
  let gatherSymbol: jest.Mock;
  let getUserIdsBySymbolProfileId: jest.Mock;
  let upsert: jest.Mock;

  beforeEach(() => {
    createValuation = jest.fn();
    deleteById = jest.fn();
    deleteValuationById = jest.fn();
    emit = jest.fn();
    finished = jest.fn().mockResolvedValue(undefined);
    gatherSymbol = jest.fn().mockResolvedValue([{ finished }]);
    getUserIdsBySymbolProfileId = jest.fn().mockResolvedValue([]);
    upsert = jest.fn();

    assetProfilesService = new AssetProfilesService(
      { getUserIdsBySymbolProfileId } as unknown as ActivitiesService,
      {
        deleteById,
        upsert
      } as unknown as AssetProfileSplitService,
      {
        create: createValuation,
        deleteById: deleteValuationById
      } as unknown as AssetProfileValuationService,
      null,
      { gatherSymbol } as unknown as DataGatheringService,
      null,
      { emit } as unknown as EventEmitter2,
      null,
      null,
      null,
      null
    );
  });

  describe('createSplit', () => {
    it('upserts the split and refreshes the asset profile data', async () => {
      const split = {} as AssetProfileSplit;
      const data = {
        dataSource: DataSource.YAHOO,
        date: new Date('2024-06-15T18:30:00.000Z'),
        denominator: 1,
        numerator: 2,
        symbol: 'AAPL',
        symbolProfileId: 'profile-id'
      };
      upsert.mockResolvedValue(split);

      const result = await assetProfilesService.createSplit(data);

      expect(upsert).toHaveBeenCalledWith({
        date: data.date,
        denominator: data.denominator,
        numerator: data.numerator,
        symbolProfileId: data.symbolProfileId
      });
      expect(gatherSymbol).toHaveBeenCalledWith({
        dataSource: data.dataSource,
        force: true,
        symbol: data.symbol
      });
      expect(result).toBe(split);
    });

    it('invalidates portfolio snapshots for users holding the asset', async () => {
      upsert.mockResolvedValue({} as AssetProfileSplit);
      getUserIdsBySymbolProfileId.mockResolvedValue(['user-1', 'user-2']);

      await assetProfilesService.createSplit({
        dataSource: DataSource.YAHOO,
        date: new Date('2024-06-15T18:30:00.000Z'),
        denominator: 1,
        numerator: 2,
        symbol: 'AAPL',
        symbolProfileId: 'profile-id'
      });
      await flushPendingPromises();

      expect(getUserIdsBySymbolProfileId).toHaveBeenCalledWith('profile-id');
      expect(emit.mock.calls.map(([, event]) => event.getUserId())).toEqual([
        'user-1',
        'user-2'
      ]);
      expect(emit.mock.calls[0][0]).toBe(PortfolioChangedEvent.getName());
    });

    it('emits the events only once the market data has been gathered', async () => {
      let completeJob: () => void;

      finished.mockReturnValue(
        new Promise<void>((resolve) => {
          completeJob = resolve;
        })
      );
      upsert.mockResolvedValue({} as AssetProfileSplit);
      getUserIdsBySymbolProfileId.mockResolvedValue(['user-1']);

      await assetProfilesService.createSplit({
        dataSource: DataSource.YAHOO,
        date: new Date('2024-06-15T18:30:00.000Z'),
        denominator: 1,
        numerator: 2,
        symbol: 'AAPL',
        symbolProfileId: 'profile-id'
      });
      await flushPendingPromises();

      expect(emit).not.toHaveBeenCalled();

      completeJob();
      await flushPendingPromises();

      expect(emit.mock.calls.map(([, event]) => event.getUserId())).toEqual([
        'user-1'
      ]);
    });
  });

  describe('deleteSplit', () => {
    it('throws NotFoundException when the scoped split does not exist', async () => {
      deleteById.mockResolvedValue(false);

      await expect(
        assetProfilesService.deleteSplit({
          dataSource: DataSource.YAHOO,
          id: 'split-id',
          symbol: 'AAPL',
          symbolProfileId: 'profile-id'
        })
      ).rejects.toBeInstanceOf(NotFoundException);
      await flushPendingPromises();

      expect(gatherSymbol).not.toHaveBeenCalled();
      expect(emit).not.toHaveBeenCalled();
    });

    it('deletes an existing split using its profile scope', async () => {
      deleteById.mockResolvedValue(true);
      getUserIdsBySymbolProfileId.mockResolvedValue(['user-1']);

      await expect(
        assetProfilesService.deleteSplit({
          dataSource: DataSource.YAHOO,
          id: 'split-id',
          symbol: 'AAPL',
          symbolProfileId: 'profile-id'
        })
      ).resolves.toBeUndefined();
      await flushPendingPromises();

      expect(deleteById).toHaveBeenCalledWith({
        id: 'split-id',
        symbolProfileId: 'profile-id'
      });
      expect(emit.mock.calls.map(([, event]) => event.getUserId())).toEqual([
        'user-1'
      ]);
      expect(gatherSymbol).toHaveBeenCalledWith({
        dataSource: DataSource.YAHOO,
        force: true,
        symbol: 'AAPL'
      });
    });
  });

  describe('createValuation', () => {
    it('creates the valuation and serializes the screenshot to base64', async () => {
      const screenshot = Buffer.from('fake-image-data');
      const valuation = {
        screenshot,
        screenshotContentType: 'image/png'
      } as unknown as AssetProfileValuation;
      createValuation.mockResolvedValue(valuation);

      const result = await assetProfilesService.createValuation({
        screenshot,
        category: 'UNDERVALUED',
        date: new Date('2024-06-15T18:30:00.000Z'),
        dividendYieldPercent: 3.2,
        peRatio: 12.5,
        screenshotContentType: 'image/png',
        symbolProfileId: 'profile-id'
      });

      expect(createValuation).toHaveBeenCalledWith({
        screenshot,
        category: 'UNDERVALUED',
        date: new Date('2024-06-15T18:30:00.000Z'),
        dividendYieldPercent: 3.2,
        peRatio: 12.5,
        screenshotContentType: 'image/png',
        symbolProfileId: 'profile-id'
      });
      expect(result).toEqual({
        screenshot: screenshot.toString('base64'),
        screenshotContentType: 'image/png'
      });
    });

    it('serializes a missing screenshot to null', async () => {
      createValuation.mockResolvedValue({
        screenshot: null,
        screenshotContentType: null
      } as unknown as AssetProfileValuation);

      const result = await assetProfilesService.createValuation({
        category: 'FAIRLY_VALUED',
        date: new Date('2024-06-15T00:00:00.000Z'),
        symbolProfileId: 'profile-id'
      });

      expect(result).toEqual({
        screenshot: null,
        screenshotContentType: null
      });
    });
  });

  describe('deleteValuation', () => {
    it('throws NotFoundException when the scoped valuation does not exist', async () => {
      deleteValuationById.mockResolvedValue(false);

      await expect(
        assetProfilesService.deleteValuation({
          id: 'valuation-id',
          symbolProfileId: 'profile-id'
        })
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deletes an existing valuation using its profile scope', async () => {
      deleteValuationById.mockResolvedValue(true);

      await expect(
        assetProfilesService.deleteValuation({
          id: 'valuation-id',
          symbolProfileId: 'profile-id'
        })
      ).resolves.toBeUndefined();

      expect(deleteValuationById).toHaveBeenCalledWith({
        id: 'valuation-id',
        symbolProfileId: 'profile-id'
      });
    });
  });
});

function flushPendingPromises() {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}
