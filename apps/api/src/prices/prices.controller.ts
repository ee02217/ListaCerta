import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { createPriceSchema, productIdSchema } from './prices.schemas';
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

  @Get('best/:productId')
  @ApiOperation({ summary: 'Get best active price for a product' })
  @ApiParam({ name: 'productId', type: String })
  async getBestPrice(
    @Param('productId', new ZodValidationPipe(productIdSchema)) productId: string,
  ) {
    return this.pricesService.getBestPrice(productId);
  }
}
