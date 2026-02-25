import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { listDevicesQuerySchema } from './devices.schemas';
import { DevicesService } from './devices.service';

@ApiTags('devices')
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  @ApiOperation({ summary: 'List anonymous devices with usage stats' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listDevices(
    @Query(new ZodValidationPipe(listDevicesQuerySchema)) query: import('./devices.schemas').ListDevicesQuery,
  ) {
    return this.devicesService.listDevices(query);
  }
}
