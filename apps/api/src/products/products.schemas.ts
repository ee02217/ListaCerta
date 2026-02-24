import { z } from 'zod';

export const barcodeSchema = z.string().trim().min(4).max(64);
export const productIdSchema = z.string().uuid();

export const listProductsQuerySchema = z.object({
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
});

export const createProductSchema = z.object({
  barcode: barcodeSchema,
  name: z.string().trim().min(1),
  brand: z.string().trim().min(1).nullable().optional(),
  category: z.string().trim().min(1).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  source: z.enum(['OFF', 'manual']).optional().default('manual'),
});

export const updateProductSchema = z
  .object({
    barcode: barcodeSchema.optional(),
    name: z.string().trim().min(1).optional(),
    brand: z.string().trim().min(1).nullable().optional(),
    category: z.string().trim().min(1).nullable().optional(),
    imageUrl: z.string().url().nullable().optional(),
    source: z.enum(['OFF', 'manual']).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update',
  });

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
export type CreateProductBody = z.infer<typeof createProductSchema>;
export type UpdateProductBody = z.infer<typeof updateProductSchema>;
