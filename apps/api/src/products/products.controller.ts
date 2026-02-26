import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  barcodeSchema,
  createProductSchema,
  listProductsQuerySchema,
  productIdSchema,
  searchProductsQuerySchema,
  updateProductSchema,
} from './products.schemas';
import { ProductsService } from './products.service';

class CreateProductBodyDto {
  barcode?: string | null;
  name!: string;
  brand?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  source?: 'OFF' | 'manual';
  isVerified?: boolean;
}

class UpdateProductBodyDto {
  barcode?: string | null;
  name?: string;
  brand?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  source?: 'OFF' | 'manual';
  isVerified?: boolean;
}

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List products (search by barcode/name/brand)' })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listProducts(
    @Query(new ZodValidationPipe(listProductsQuerySchema)) query: import('./products.schemas').ListProductsQuery,
  ) {
    return this.productsService.listProducts(query);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search products by name or brand' })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async searchProducts(
    @Query(new ZodValidationPipe(searchProductsQuerySchema)) query: import('./products.schemas').SearchProductsQuery,
  ) {
    return this.productsService.searchProducts(query.q, query.limit);
  }

  @Get('id/:id')
  @ApiOperation({ summary: 'Get product by internal id' })
  @ApiParam({ name: 'id', type: String })
  async getById(@Param('id', new ZodValidationPipe(productIdSchema)) id: string) {
    return this.productsService.getById(id);
  }

  @Get('barcode/:barcode')
  @ApiOperation({ summary: 'Get product by barcode (cache-aside with OpenFoodFacts)' })
  @ApiParam({ name: 'barcode', type: String })
  async getByBarcode(
    @Param('barcode', new ZodValidationPipe(barcodeSchema)) barcode: string,
  ) {
    return this.productsService.getByBarcodeWithCacheAside(barcode);
  }

  // Legacy alias kept for backward compatibility.
  @Get(':barcode')
  @ApiOperation({ summary: 'Get product by barcode (legacy route alias)' })
  @ApiParam({ name: 'barcode', type: String })
  async getByBarcodeLegacy(
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
  @ApiOperation({ summary: 'Update product fields (partial)' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateProductBodyDto })
  async updateProductPatch(
    @Param('id', new ZodValidationPipe(productIdSchema)) id: string,
    @Body(new ZodValidationPipe(updateProductSchema)) body: import('./products.schemas').UpdateProductBody,
  ) {
    return this.productsService.updateProduct(id, body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update product fields / save overrides / mark verified' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateProductBodyDto })
  async updateProductPut(
    @Param('id', new ZodValidationPipe(productIdSchema)) id: string,
    @Body(new ZodValidationPipe(updateProductSchema)) body: import('./products.schemas').UpdateProductBody,
  ) {
    return this.productsService.updateProduct(id, body);
  }
}
