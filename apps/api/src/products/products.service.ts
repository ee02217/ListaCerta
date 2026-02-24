import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductSource } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateProductBody } from './products.schemas';
import { OpenFoodFactsService } from './open-food-facts.service';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly openFoodFactsService: OpenFoodFactsService,
  ) {}

  async getByBarcodeWithCacheAside(barcode: string) {
    const localProduct = await this.prisma.product.findUnique({
      where: { barcode },
    });

    if (localProduct) {
      return localProduct;
    }

    const offProduct = await this.openFoodFactsService.fetchProductByBarcode(barcode);

    if (!offProduct) {
      throw new NotFoundException(`Product not found for barcode: ${barcode}`);
    }

    return this.prisma.product.upsert({
      where: { barcode },
      update: {
        name: offProduct.name,
        brand: offProduct.brand,
        category: offProduct.category,
        imageUrl: offProduct.imageUrl,
        source: ProductSource.OFF,
      },
      create: {
        barcode: offProduct.barcode,
        name: offProduct.name,
        brand: offProduct.brand,
        category: offProduct.category,
        imageUrl: offProduct.imageUrl,
        source: ProductSource.OFF,
      },
    });
  }

  async createManualProduct(body: CreateProductBody) {
    try {
      return await this.prisma.product.create({
        data: {
          barcode: body.barcode,
          name: body.name,
          brand: body.brand ?? null,
          category: body.category ?? null,
          imageUrl: body.imageUrl ?? null,
          source: body.source,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Product with barcode ${body.barcode} already exists`);
      }

      throw error;
    }
  }
}
