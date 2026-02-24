import { z } from 'zod';

export const createStoreSchema = z.object({
  name: z.string().trim().min(1),
  location: z.string().trim().min(1).nullable().optional(),
});

export type CreateStoreBody = z.infer<typeof createStoreSchema>;
