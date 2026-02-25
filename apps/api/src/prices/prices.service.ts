import {
  PriceAggregationSchema,
  PriceSubmissionResultSchema,
  PriceWithRelationsSchema,
  PricesWithRelationsArraySchema,
} from '@listacerta/shared-types';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreatePriceBody, ListModerationQuery, ModeratePriceBody } from './prices.schemas';

@Injectable()
export class PricesService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveBestActivePrice(productId: string) {
    const bestPrice = await this.prisma.price.findFirst({
      where: {
        productId,
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
      throw new NotFoundException(`No active prices for product: ${productId}`);
    }

    return bestPrice;
  }

  async createPrice(body: CreatePriceBody) {
    if (body.idempotencyKey) {
      const existing = await this.prisma.price.findUnique({
        where: { idempotencyKey: body.idempotencyKey },
        include: {
          product: true,
          store: true,
          device: true,
        },
      });

      if (existing) {
        const bestPrice = await this.resolveBestActivePrice(existing.productId);

        return PriceSubmissionResultSchema.parse({
          createdPrice: existing,
          bestPrice,
        });
      }
    }

    const [product, store, aggregate] = await Promise.all([
      this.prisma.product.findUnique({ where: { id: body.productId } }),
      this.prisma.store.findUnique({ where: { id: body.storeId } }),
      this.prisma.price.aggregate({
        where: {
          productId: body.productId,
          status: 'active',
        },
        _avg: {
          priceCents: true,
        },
      }),
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

    const avgPrice = aggregate._avg.priceCents ?? null;
    const deviationRatio = avgPrice && avgPrice > 0 ? Math.abs(body.priceCents - avgPrice) / avgPrice : 0;
    const autoFlagged = avgPrice != null && deviationRatio > 0.5;
    const confidenceScore = Number(Math.max(0, 1 - Math.min(1, deviationRatio)).toFixed(3));
    const finalStatus = autoFlagged ? 'flagged' : body.status;

    let createdPrice;

    try {
      createdPrice = await this.prisma.price.create({
        data: {
          productId: body.productId,
          storeId: body.storeId,
          priceCents: body.priceCents,
          currency: body.currency,
          capturedAt: body.capturedAt ? new Date(body.capturedAt) : new Date(),
          submittedBy: body.submittedBy ?? null,
          photoUrl: body.photoUrl ?? null,
          status: finalStatus,
          confidenceScore,
          idempotencyKey: body.idempotencyKey ?? null,
        },
        include: {
          product: true,
          store: true,
          device: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        body.idempotencyKey
      ) {
        const existing = await this.prisma.price.findUnique({
          where: { idempotencyKey: body.idempotencyKey },
          include: {
            product: true,
            store: true,
            device: true,
          },
        });

        if (existing) {
          const bestPrice = await this.resolveBestActivePrice(existing.productId);

          return PriceSubmissionResultSchema.parse({
            createdPrice: existing,
            bestPrice,
          });
        }
      }

      throw error;
    }

    const bestPrice = await this.resolveBestActivePrice(body.productId);

    return PriceSubmissionResultSchema.parse({
      createdPrice,
      bestPrice,
    });
  }

  async getBestPrice(productId: string) {
    const history = await this.getPriceHistory(productId);

    if (history.length === 0) {
      throw new NotFoundException(`No active prices for product: ${productId}`);
    }

    const bestOverall = [...history].sort((a, b) => a.priceCents - b.priceCents || +new Date(b.capturedAt) - +new Date(a.capturedAt))[0];

    const groupedMap = new Map<string, (typeof history)[number]>();

    for (const price of history) {
      const current = groupedMap.get(price.storeId);

      if (!current) {
        groupedMap.set(price.storeId, price);
        continue;
      }

      const shouldReplace =
        price.priceCents < current.priceCents ||
        (price.priceCents === current.priceCents && +new Date(price.capturedAt) > +new Date(current.capturedAt));

      if (shouldReplace) {
        groupedMap.set(price.storeId, price);
      }
    }

    const groupedByStore = [...groupedMap.values()]
      .sort((a, b) => a.priceCents - b.priceCents)
      .map((price) => ({
        store: price.store,
        bestPrice: price,
      }));

    return PriceAggregationSchema.parse({
      bestOverall,
      groupedByStore,
      priceHistory: history,
    });
  }

  async getPriceHistory(productId: string) {
    const history = await this.prisma.price.findMany({
      where: {
        productId,
        status: 'active',
      },
      orderBy: [{ capturedAt: 'desc' }],
      include: {
        product: true,
        store: true,
        device: true,
      },
    });

    return PricesWithRelationsArraySchema.parse(history);
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
