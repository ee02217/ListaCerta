import { Controller, Get } from '@nestjs/common';
import { ListSchema } from '@listacerta/shared-types';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return { status: 'ok', service: 'api' };
  }

  @Get('example-list')
  exampleList() {
    return ListSchema.parse({
      id: 'api-example-id',
      name: 'API Example List',
      createdAt: new Date().toISOString(),
    });
  }
}
