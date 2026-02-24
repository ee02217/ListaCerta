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
    try {
      const store = await this.prisma.store.create({
        data: {
          name: body.name,
          location: body.location ?? null,
        },
      });

      return StoreSchema.parse(store);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Store with name ${body.name} already exists`);
      }

      throw error;
    }
  }
}
