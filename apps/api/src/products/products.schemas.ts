import { z } from 'zod';

export const barcodeSchema = z.string().trim().min(4).max(64);

export const createProductSchema = z.object({
  barcode: barcodeSchema,
  name: z.string().trim().min(1),
  brand: z.string().trim().min(1).nullable().optional(),
  category: z.string().trim().min(1).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  source: z.enum(['OFF', 'manual']).optional().default('manual'),
});

export type CreateProductBody = z.infer<typeof createProductSchema>;
