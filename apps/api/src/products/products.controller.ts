import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  barcodeSchema,
  createProductSchema,
  listProductsQuerySchema,
  productIdSchema,
  updateProductSchema,
} from './products.schemas';
import { ProductsService } from './products.service';

class CreateProductBodyDto {
  barcode!: string;
  name!: string;
  brand?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  source?: 'OFF' | 'manual';
}

class UpdateProductBodyDto {
  barcode?: string;
  name?: string;
  brand?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  source?: 'OFF' | 'manual';
}

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List products (search by barcode or name)' })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listProducts(
    @Query(new ZodValidationPipe(listProductsQuerySchema)) query: import('./products.schemas').ListProductsQuery,
  ) {
    return this.productsService.listProducts(query);
  }

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

  @Patch(':id')
  @ApiOperation({ summary: 'Update product fields' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateProductBodyDto })
  async updateProduct(
    @Param('id', new ZodValidationPipe(productIdSchema)) id: string,
    @Body(new ZodValidationPipe(updateProductSchema)) body: import('./products.schemas').UpdateProductBody,
  ) {
    return this.productsService.updateProduct(id, body);
  }
}
