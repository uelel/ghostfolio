import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';

import { Module } from '@nestjs/common';

import { AssetProfileValuationService } from './asset-profile-valuation.service';

@Module({
  exports: [AssetProfileValuationService],
  imports: [PrismaModule],
  providers: [AssetProfileValuationService]
})
export class AssetProfileValuationModule {}
