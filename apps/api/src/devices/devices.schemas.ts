import { z } from 'zod';

export const listDevicesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional().default(200),
});

export type ListDevicesQuery = z.infer<typeof listDevicesQuerySchema>;
