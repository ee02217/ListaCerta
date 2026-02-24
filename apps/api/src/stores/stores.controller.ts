import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { createStoreSchema } from './stores.schemas';
import { StoresService } from './stores.service';

class CreateStoreBodyDto {
  name!: string;
  location?: string | null;
}

@ApiTags('stores')
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get()
  @ApiOperation({ summary: 'List stores' })
  async getStores() {
    return this.storesService.getStores();
  }

  @Post()
  @ApiOperation({ summary: 'Create store' })
  @ApiBody({ type: CreateStoreBodyDto })
  async createStore(@Body(new ZodValidationPipe(createStoreSchema)) body: CreateStoreBodyDto) {
    return this.storesService.createStore(body);
  }
}
