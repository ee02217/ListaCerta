import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { barcodeSchema, createProductSchema } from './products.schemas';
import { ProductsService } from './products.service';

class CreateProductBodyDto {
  barcode!: string;
  name!: string;
  brand?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  source?: 'OFF' | 'manual';
}

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get(':barcode')
  @ApiOperation({ summary: 'Get product by barcode (cache-aside with OpenFoodFacts)' })
  @ApiParam({ name: 'barcode', type: String })
  async getByBarcode(
    @Param('barcode', new ZodValidationPipe(barcodeSchema)) barcode: string,
  ) {
    return this.productsService.getByBarcodeWithCacheAside(barcode);
  }

  @Post()
  @ApiOperation({ summary: 'Create product manually' })
  @ApiBody({ type: CreateProductBodyDto })
  async createProduct(
    @Body(new ZodValidationPipe(createProductSchema)) body: import('./products.schemas').CreateProductBody,
  ) {
    return this.productsService.createManualProduct(body);
  }
}
