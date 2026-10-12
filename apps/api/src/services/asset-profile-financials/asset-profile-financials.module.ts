import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';

import { Module } from '@nestjs/common';

import { AssetProfileFinancialsService } from './asset-profile-financials.service';

@Module({
  exports: [AssetProfileFinancialsService],
  imports: [PrismaModule],
  providers: [AssetProfileFinancialsService]
})
export class AssetProfileFinancialsModule {}
