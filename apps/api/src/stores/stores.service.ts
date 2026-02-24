import { StoreSchema, StoresArraySchema } from '@listacerta/shared-types';
import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateStoreBody } from './stores.schemas';

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  async getStores() {
    const stores = await this.prisma.store.findMany({
      orderBy: { name: 'asc' },
    });

    return StoresArraySchema.parse(stores);
  }

  async createStore(body: CreateStoreBody) {
    const normalizedName = body.name.trim();
    const normalizedLocation = body.location?.trim() || null;

    const existing = await this.prisma.store.findFirst({
      where: {
        name: {
          equals: normalizedName,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Store with name ${normalizedName} already exists`);
    }

    try {
      const store = await this.prisma.store.create({
        data: {
          name: normalizedName,
          location: normalizedLocation,
        },
      });

      return StoreSchema.parse(store);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Store with name ${normalizedName} already exists`);
      }

      throw error;
    }
  }
}
