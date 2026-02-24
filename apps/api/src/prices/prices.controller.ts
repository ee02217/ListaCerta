import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createPriceSchema,
  listModerationQuerySchema,
  moderatePriceSchema,
  priceIdSchema,
  productIdSchema,
} from './prices.schemas';
import { PricesService } from './prices.service';

class CreatePriceBodyDto {
  productId!: string;
  storeId!: string;
  priceCents!: number;
  currency!: string;
  capturedAt?: string;
  submittedBy?: string | null;
  photoUrl?: string | null;
  status?: 'active' | 'flagged';
}

class ModeratePriceBodyDto {
  status!: 'active' | 'flagged';
}

@ApiTags('prices')
@Controller('prices')
export class PricesController {
  constructor(private readonly pricesService: PricesService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a price capture' })
  @ApiBody({ type: CreatePriceBodyDto })
  async createPrice(
    @Body(new ZodValidationPipe(createPriceSchema)) body: import('./prices.schemas').CreatePriceBody,
  ) {
    return this.pricesService.createPrice(body);
  }

  @Get('moderation')
  @ApiOperation({ summary: 'List prices for moderation' })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'flagged'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listModerationQueue(
    @Query(new ZodValidationPipe(listModerationQuerySchema))
    query: import('./prices.schemas').ListModerationQuery,
  ) {
    return this.pricesService.listModerationQueue(query);
  }

  @Patch(':id/moderation')
  @ApiOperation({ summary: 'Moderate price status (approve/reject/flag)' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: ModeratePriceBodyDto })
  async moderatePrice(
    @Param('id', new ZodValidationPipe(priceIdSchema)) id: string,
    @Body(new ZodValidationPipe(moderatePriceSchema)) body: import('./prices.schemas').ModeratePriceBody,
  ) {
    return this.pricesService.moderatePrice(id, body);
  }

  @Get('best/:productId')
  @ApiOperation({ summary: 'Get best active price for a product' })
  @ApiParam({ name: 'productId', type: String })
  async getBestPrice(
    @Param('productId', new ZodValidationPipe(productIdSchema)) productId: string,
  ) {
    return this.pricesService.getBestPrice(productId);
  }
}
