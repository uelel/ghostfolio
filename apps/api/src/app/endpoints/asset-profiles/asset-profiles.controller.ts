import { AllowDuringImpersonation } from '@ghostfolio/api/decorators/allow-during-impersonation.decorator';
import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { TransformDataSourceInRequestInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.interceptor';
import { TransformDataSourceInResponseInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-response/transform-data-source-in-response.interceptor';
import { ApiService } from '@ghostfolio/api/services/api/api.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import {
  CreateAssetProfileFinancialsDto,
  CreateAssetProfileSplitDto,
  CreateAssetProfileValuationDto,
  UpdateAssetProfileDataDto,
  UpdateAssetProfileFinancialsDto
} from '@ghostfolio/common/dtos';
import { getCurrencyFromSymbol, isCurrency } from '@ghostfolio/common/helper';
import { AssetProfileResponse } from '@ghostfolio/common/interfaces';
import {
  AssetProfileFinancials,
  AssetProfilesResponse,
  AssetProfileValuation,
  EnhancedAssetProfile
} from '@ghostfolio/common/interfaces';
import { hasPermission } from '@ghostfolio/common/permissions';
import { permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { AssetProfileSplit, DataSource } from '@prisma/client';
import { parseISO } from 'date-fns';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { AssetProfilesService } from './asset-profiles.service';
import { GetAssetProfilesDto } from './get-asset-profiles.dto';

@AllowDuringImpersonation()
@Controller('asset-profiles')
export class AssetProfilesController {
  public constructor(
    private readonly apiService: ApiService,
    private readonly assetProfilesService: AssetProfilesService,
    @Inject(REQUEST) private readonly request: RequestWithUser,
    private readonly symbolProfileService: SymbolProfileService
  ) {}

  @Get()
  @HasPermission(permissions.accessAdminControl)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getAssetProfiles(
    @Query()
    {
      assetSubClasses: filterByAssetSubClasses,
      dataSource: filterByDataSource,
      presetId,
      query: filterBySearchQuery,
      skip,
      sortColumn,
      sortDirection,
      take
    }: GetAssetProfilesDto
  ): Promise<AssetProfilesResponse> {
    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAssetSubClasses,
      filterByDataSource,
      filterBySearchQuery
    });

    return this.assetProfilesService.getAssetProfiles({
      filters,
      presetId,
      skip,
      sortColumn,
      sortDirection,
      take
    });
  }

  @Get(':dataSource/:symbol')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  public async getAssetProfile(
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ): Promise<AssetProfileResponse> {
    const [assetProfile] = await this.symbolProfileService.getSymbolProfiles([
      { dataSource, symbol }
    ]);

    if (!assetProfile && !isCurrency(getCurrencyFromSymbol(symbol))) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    const canReadAllAssetProfiles = hasPermission(
      this.request.user.permissions,
      permissions.readMarketData
    );

    const canReadOwnAssetProfile =
      assetProfile?.userId === this.request.user.id &&
      hasPermission(
        this.request.user.permissions,
        permissions.readMarketDataOfOwnAssetProfile
      );

    if (!canReadAllAssetProfiles && !canReadOwnAssetProfile) {
      throw new HttpException(
        assetProfile?.userId
          ? getReasonPhrase(StatusCodes.NOT_FOUND)
          : getReasonPhrase(StatusCodes.FORBIDDEN),
        assetProfile?.userId ? StatusCodes.NOT_FOUND : StatusCodes.FORBIDDEN
      );
    }

    return this.assetProfilesService.getAssetProfile({
      dataSource,
      symbol
    });
  }

  @Post(':dataSource/:symbol/splits')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async createSplit(
    @Body() data: CreateAssetProfileSplitDto,
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ): Promise<AssetProfileSplit> {
    const { id: symbolProfileId } = await this.validateAccessToAssetProfile({
      dataSource,
      symbol,
      permission: permissions.createAssetProfileSplit,
      permissionOfOwnAssetProfile:
        permissions.createAssetProfileSplitOfOwnAssetProfile
    });

    return this.assetProfilesService.createSplit({
      dataSource,
      symbol,
      symbolProfileId,
      date: parseISO(data.date),
      denominator: data.denominator,
      numerator: data.numerator
    });
  }

  @Delete(':dataSource/:symbol/splits/:id')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async deleteSplit(
    @Param('dataSource') dataSource: DataSource,
    @Param('id') id: string,
    @Param('symbol') symbol: string
  ): Promise<void> {
    const { id: symbolProfileId } = await this.validateAccessToAssetProfile({
      dataSource,
      symbol,
      permission: permissions.deleteAssetProfileSplit,
      permissionOfOwnAssetProfile:
        permissions.deleteAssetProfileSplitOfOwnAssetProfile
    });

    return this.assetProfilesService.deleteSplit({
      dataSource,
      id,
      symbol,
      symbolProfileId
    });
  }

  @Post(':dataSource/:symbol/valuations')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async createValuation(
    @Body() data: CreateAssetProfileValuationDto,
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ): Promise<AssetProfileValuation> {
    const { id: symbolProfileId } = await this.validateAccessToAssetProfile({
      dataSource,
      symbol,
      permission: permissions.createAssetProfileValuation,
      permissionOfOwnAssetProfile:
        permissions.createAssetProfileValuationOfOwnAssetProfile
    });

    return this.assetProfilesService.createValuation({
      symbolProfileId,
      category: data.category,
      date: parseISO(data.date),
      dividendYieldPercent: data.dividendYieldPercent,
      peRatio: data.peRatio,
      screenshot: data.screenshot
        ? Buffer.from(data.screenshot, 'base64')
        : undefined,
      screenshotContentType: data.screenshotContentType
    });
  }

  @Post(':dataSource/:symbol/financials')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async createFinancials(
    @Body() data: CreateAssetProfileFinancialsDto,
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ): Promise<AssetProfileFinancials> {
    const { id: symbolProfileId } = await this.validateAccessToAssetProfile({
      dataSource,
      symbol,
      permission: permissions.createAssetProfileFinancials,
      permissionOfOwnAssetProfile:
        permissions.createAssetProfileFinancialsOfOwnAssetProfile
    });

    return this.assetProfilesService.createFinancials({
      symbolProfileId,
      date: parseISO(data.date)
    });
  }

  @Patch(':dataSource/:symbol/financials/:id')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async updateFinancials(
    @Body() data: UpdateAssetProfileFinancialsDto,
    @Param('dataSource') dataSource: DataSource,
    @Param('id') id: string,
    @Param('symbol') symbol: string
  ): Promise<AssetProfileFinancials> {
    const { id: symbolProfileId } = await this.validateAccessToAssetProfile({
      dataSource,
      symbol,
      permission: permissions.updateAssetProfileFinancials,
      permissionOfOwnAssetProfile:
        permissions.updateAssetProfileFinancialsOfOwnAssetProfile
    });

    return this.assetProfilesService.updateFinancials({
      data,
      id,
      symbolProfileId
    });
  }

  @Delete(':dataSource/:symbol/financials/:id')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async deleteFinancials(
    @Param('dataSource') dataSource: DataSource,
    @Param('id') id: string,
    @Param('symbol') symbol: string
  ): Promise<void> {
    const { id: symbolProfileId } = await this.validateAccessToAssetProfile({
      dataSource,
      symbol,
      permission: permissions.deleteAssetProfileFinancials,
      permissionOfOwnAssetProfile:
        permissions.deleteAssetProfileFinancialsOfOwnAssetProfile
    });

    return this.assetProfilesService.deleteFinancials({
      id,
      symbolProfileId
    });
  }

  @Delete(':dataSource/:symbol/valuations/:id')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async deleteValuation(
    @Param('dataSource') dataSource: DataSource,
    @Param('id') id: string,
    @Param('symbol') symbol: string
  ): Promise<void> {
    const { id: symbolProfileId } = await this.validateAccessToAssetProfile({
      dataSource,
      symbol,
      permission: permissions.deleteAssetProfileValuation,
      permissionOfOwnAssetProfile:
        permissions.deleteAssetProfileValuationOfOwnAssetProfile
    });

    return this.assetProfilesService.deleteValuation({
      id,
      symbolProfileId
    });
  }

  @HasPermission(permissions.accessAdminControl)
  @Patch(':dataSource/:symbol')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async updateAssetProfileData(
    @Body() assetProfileData: UpdateAssetProfileDataDto,
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ): Promise<EnhancedAssetProfile> {
    if (!this.request.user.settings.settings.isExperimentalFeatures) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    return this.assetProfilesService.updateAssetProfileData(
      { dataSource, symbol },
      assetProfileData
    );
  }

  private async validateAccessToAssetProfile({
    dataSource,
    permission,
    permissionOfOwnAssetProfile,
    symbol
  }: {
    dataSource: DataSource;
    permission: string;
    permissionOfOwnAssetProfile: string;
    symbol: string;
  }) {
    const [assetProfile] = await this.symbolProfileService.getSymbolProfiles([
      { dataSource, symbol }
    ]);

    if (!assetProfile) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    const canAccessAllAssetProfiles = hasPermission(
      this.request.user.permissions,
      permission
    );

    const canAccessOwnAssetProfile =
      assetProfile.userId === this.request.user.id &&
      hasPermission(this.request.user.permissions, permissionOfOwnAssetProfile);

    if (!canAccessAllAssetProfiles && !canAccessOwnAssetProfile) {
      throw new HttpException(
        assetProfile.userId
          ? getReasonPhrase(StatusCodes.NOT_FOUND)
          : getReasonPhrase(StatusCodes.FORBIDDEN),
        assetProfile.userId ? StatusCodes.NOT_FOUND : StatusCodes.FORBIDDEN
      );
    }

    return assetProfile;
  }
}
