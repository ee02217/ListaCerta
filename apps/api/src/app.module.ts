import { Module } from '@nestjs/common';

import { AnalyticsController } from './analytics/analytics.controller';
import { AnalyticsService } from './analytics/analytics.service';
import { DevicesController } from './devices/devices.controller';
import { DevicesService } from './devices/devices.service';
import { HealthController } from './health.controller';
import { PricesController } from './prices/prices.controller';
import { PricesService } from './prices/prices.service';
import { PrismaModule } from './prisma/prisma.module';
import { OpenFoodFactsService } from './products/open-food-facts.service';
import { ProductsController } from './products/products.controller';
import { ProductsService } from './products/products.service';
import { StoresController } from './stores/stores.controller';
import { StoresService } from './stores/stores.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    HealthController,
    ProductsController,
    PricesController,
    StoresController,
    DevicesController,
    AnalyticsController,
  ],
  providers: [
    ProductsService,
    OpenFoodFactsService,
    PricesService,
    StoresService,
    DevicesService,
    AnalyticsService,
  ],
})
export class AppModule {}
