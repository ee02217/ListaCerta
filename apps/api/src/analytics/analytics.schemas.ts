import { z } from 'zod';

export const analyticsSummaryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).optional().default(5),
});

export type AnalyticsSummaryQuery = z.infer<typeof analyticsSummaryQuerySchema>;
