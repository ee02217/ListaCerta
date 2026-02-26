import { ProductSchema, ProductsArraySchema } from '@listacerta/shared-types';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductSource } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateProductBody, ListProductsQuery, UpdateProductBody } from './products.schemas';
import { OpenFoodFactsService } from './open-food-facts.service';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly openFoodFactsService: OpenFoodFactsService,
  ) {}

  async listProducts(query: ListProductsQuery) {
    const search = query.q?.trim();

    const products = await this.prisma.product.findMany({
      where: search
        ? {
            OR: [
              { barcode: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
              { brand: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: [{ updatedAt: 'desc' }],
      take: query.limit,
    });

    return ProductsArraySchema.parse(products);
  }

  async searchProducts(q: string, limit = 25) {
    const normalized = q.trim();

    const products = await this.prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: normalized, mode: 'insensitive' } },
          { brand: { contains: normalized, mode: 'insensitive' } },
        ],
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: limit,
    });

    return ProductsArraySchema.parse(products);
  }

  async getById(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });

    if (!product) {
      throw new NotFoundException(`Product not found: ${id}`);
    }

    return ProductSchema.parse(product);
  }

  async getByBarcodeWithCacheAside(barcode: string) {
    const localProduct = await this.prisma.product.findUnique({
      where: { barcode },
    });

    if (localProduct) {
      return ProductSchema.parse(localProduct);
    }

    const offProduct = await this.openFoodFactsService.fetchProductByBarcode(barcode);

    if (!offProduct) {
      throw new NotFoundException(`Product not found for barcode: ${barcode}`);
    }

    const product = await this.prisma.product.upsert({
      where: { barcode },
      update: {
        name: offProduct.name,
        brand: offProduct.brand,
        category: offProduct.category,
        imageUrl: offProduct.imageUrl,
        source: ProductSource.OFF,
        cachedAt: new Date(),
      },
      create: {
        barcode: offProduct.barcode,
        name: offProduct.name,
        brand: offProduct.brand,
        category: offProduct.category,
        imageUrl: offProduct.imageUrl,
        source: ProductSource.OFF,
        cachedAt: new Date(),
      },
    });

    return ProductSchema.parse(product);
  }

  async createManualProduct(body: CreateProductBody) {
    const normalizedName = body.name.trim();
    const normalizedBrand = body.brand?.trim() || null;

    if (!body.barcode) {
      const existing = await this.prisma.product.findFirst({
        where: {
          name: { equals: normalizedName, mode: 'insensitive' },
          ...(normalizedBrand
            ? { brand: { equals: normalizedBrand, mode: 'insensitive' } }
            : { brand: null }),
        },
      });

      if (existing) {
        return ProductSchema.parse(existing);
      }
    }

    try {
      const product = await this.prisma.product.create({
        data: {
          barcode: body.barcode ?? null,
          name: normalizedName,
          brand: normalizedBrand,
          category: body.category?.trim() || null,
          imageUrl: body.imageUrl ?? null,
          source: body.source,
          isVerified: body.isVerified,
        },
      });

      return ProductSchema.parse(product);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        if (body.barcode) {
          throw new ConflictException(`Product with barcode ${body.barcode} already exists`);
        }

        throw new ConflictException('Product already exists');
      }

      throw error;
    }
  }

  async updateProduct(id: string, body: UpdateProductBody) {
    const hasOverrideFields =
      body.barcode !== undefined ||
      body.name !== undefined ||
      body.brand !== undefined ||
      body.category !== undefined ||
      body.imageUrl !== undefined;

    const overrideSource = body.source ?? (hasOverrideFields ? ProductSource.manual : undefined);

    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: {
          barcode: body.barcode,
          name: body.name,
          brand: body.brand,
          category: body.category,
          imageUrl: body.imageUrl,
          source: overrideSource,
          isVerified: body.isVerified,
        },
      });

      return ProductSchema.parse(product);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Product not found: ${id}`);
        }

        if (error.code === 'P2002') {
          throw new ConflictException(`Product with barcode ${body.barcode} already exists`);
        }
      }

      throw error;
    }
  }
}
