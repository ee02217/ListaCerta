import {
  PriceSubmissionResultSchema,
  PriceWithRelationsSchema,
  PricesWithRelationsArraySchema,
} from '@listacerta/shared-types';
import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreatePriceBody, ListModerationQuery, ModeratePriceBody } from './prices.schemas';

@Injectable()
export class PricesService {
  constructor(private readonly prisma: PrismaService) {}

  async createPrice(body: CreatePriceBody) {
    const [product, store] = await Promise.all([
      this.prisma.product.findUnique({ where: { id: body.productId } }),
      this.prisma.store.findUnique({ where: { id: body.storeId } }),
    ]);

    if (!product) {
      throw new NotFoundException(`Product not found: ${body.productId}`);
    }

    if (!store) {
      throw new NotFoundException(`Store not found: ${body.storeId}`);
    }

    if (body.submittedBy) {
      await this.prisma.device.upsert({
        where: { id: body.submittedBy },
        create: { id: body.submittedBy },
        update: {},
      });
    }

    const createdPrice = await this.prisma.price.create({
      data: {
        productId: body.productId,
        storeId: body.storeId,
        priceCents: body.priceCents,
        currency: body.currency,
        capturedAt: body.capturedAt ? new Date(body.capturedAt) : new Date(),
        submittedBy: body.submittedBy ?? null,
        photoUrl: body.photoUrl ?? null,
        status: body.status,
      },
      include: {
        product: true,
        store: true,
        device: true,
      },
    });

    const bestPrice = await this.prisma.price.findFirst({
      where: {
        productId: body.productId,
        status: 'active',
      },
      orderBy: [{ priceCents: 'asc' }, { capturedAt: 'desc' }],
      include: {
        product: true,
        store: true,
        device: true,
      },
    });

    if (!bestPrice) {
      throw new NotFoundException(`No active prices for product: ${body.productId}`);
    }

    return PriceSubmissionResultSchema.parse({
      createdPrice,
      bestPrice,
    });
  }

  async getBestPrice(productId: string) {
    const bestPrice = await this.prisma.price.findFirst({
      where: {
        productId,
        status: 'active',
      },
      orderBy: [{ priceCents: 'asc' }, { capturedAt: 'desc' }],
      include: {
        product: true,
        store: true,
      },
    });

    if (!bestPrice) {
      throw new NotFoundException(`No active prices for product: ${productId}`);
    }

    return PriceWithRelationsSchema.parse(bestPrice);
  }

  async listModerationQueue(query: ListModerationQuery) {
    const prices = await this.prisma.price.findMany({
      where: query.status ? { status: query.status } : undefined,
      include: {
        product: true,
        store: true,
        device: true,
      },
      orderBy: [{ capturedAt: 'desc' }],
      take: query.limit,
    });

    return PricesWithRelationsArraySchema.parse(prices);
  }

  async moderatePrice(id: string, body: ModeratePriceBody) {
    try {
      const price = await this.prisma.price.update({
        where: { id },
        data: { status: body.status },
        include: {
          product: true,
          store: true,
          device: true,
        },
      });

      return PriceWithRelationsSchema.parse(price);
    } catch {
      throw new NotFoundException(`Price not found: ${id}`);
    }
  }
}
