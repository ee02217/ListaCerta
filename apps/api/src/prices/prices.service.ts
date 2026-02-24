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

    return this.prisma.price.create({
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

    return bestPrice;
  }

  async listModerationQueue(query: ListModerationQuery) {
    return this.prisma.price.findMany({
      where: query.status ? { status: query.status } : undefined,
      include: {
        product: true,
        store: true,
        device: true,
      },
      orderBy: [{ capturedAt: 'desc' }],
      take: query.limit,
    });
  }

  async moderatePrice(id: string, body: ModeratePriceBody) {
    try {
      return await this.prisma.price.update({
        where: { id },
        data: { status: body.status },
        include: {
          product: true,
          store: true,
          device: true,
        },
      });
    } catch {
      throw new NotFoundException(`Price not found: ${id}`);
    }
  }
}
