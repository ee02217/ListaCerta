import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { ListDevicesQuery } from './devices.schemas';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async listDevices(query: ListDevicesQuery) {
    const [devices, groupedUsage] = await Promise.all([
      this.prisma.device.findMany({
        orderBy: { createdAt: 'desc' },
        take: query.limit,
      }),
      this.prisma.price.groupBy({
        by: ['submittedBy'],
        where: {
          submittedBy: {
            not: null,
          },
        },
        _count: {
          _all: true,
        },
        _max: {
          capturedAt: true,
        },
      }),
    ]);

    const usageMap = new Map(
      groupedUsage
        .filter((item) => item.submittedBy)
        .map((item) => [
          item.submittedBy as string,
          {
            submissionsCount: item._count._all,
            lastUsedAt: item._max.capturedAt,
          },
        ]),
    );

    return devices.map((device) => {
      const usage = usageMap.get(device.id);

      return {
        id: device.id,
        createdAt: device.createdAt,
        submissionsCount: usage?.submissionsCount ?? 0,
        lastUsedAt: usage?.lastUsedAt ?? null,
      };
    });
  }
}
