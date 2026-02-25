import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(limit: number) {
    const [totalProducts, totalPrices, groupedByStore, groupedByProduct] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.price.count(),
      this.prisma.price.groupBy({
        by: ['storeId'],
        _count: { _all: true },
      }),
      this.prisma.price.groupBy({
        by: ['productId'],
        _count: { _all: true },
      }),
    ]);

    const topStoreGroups = [...groupedByStore]
      .sort((a, b) => b._count._all - a._count._all)
      .slice(0, limit);

    const topProductGroups = [...groupedByProduct]
      .sort((a, b) => b._count._all - a._count._all)
      .slice(0, limit);

    const [stores, products] = await Promise.all([
      this.prisma.store.findMany({
        where: { id: { in: topStoreGroups.map((row) => row.storeId) } },
      }),
      this.prisma.product.findMany({
        where: { id: { in: topProductGroups.map((row) => row.productId) } },
      }),
    ]);

    const storeMap = new Map(stores.map((store) => [store.id, store]));
    const productMap = new Map(products.map((product) => [product.id, product]));

    return {
      totals: {
        products: totalProducts,
        prices: totalPrices,
      },
      mostActiveStores: topStoreGroups.map((row) => {
        const store = storeMap.get(row.storeId);

        return {
          storeId: row.storeId,
          name: store?.name ?? 'Unknown store',
          submissionsCount: row._count._all,
        };
      }),
      mostScannedProducts: topProductGroups.map((row) => {
        const product = productMap.get(row.productId);

        return {
          productId: row.productId,
          name: product?.name ?? 'Unknown product',
          barcode: product?.barcode ?? 'N/A',
          scansCount: row._count._all,
        };
      }),
      generatedAt: new Date().toISOString(),
    };
  }
}
