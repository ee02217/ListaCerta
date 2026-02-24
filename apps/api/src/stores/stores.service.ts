import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateStoreBody } from './stores.schemas';

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  async getStores() {
    return this.prisma.store.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createStore(body: CreateStoreBody) {
    try {
      return await this.prisma.store.create({
        data: {
          name: body.name,
          location: body.location ?? null,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Store with name ${body.name} already exists`);
      }

      throw error;
    }
  }
}
