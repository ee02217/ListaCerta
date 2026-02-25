import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { analyticsSummaryQuerySchema } from './analytics.schemas';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Basic analytics summary for dashboard' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getSummary(
    @Query(new ZodValidationPipe(analyticsSummaryQuerySchema))
    query: import('./analytics.schemas').AnalyticsSummaryQuery,
  ) {
    return this.analyticsService.getSummary(query.limit);
  }
}
