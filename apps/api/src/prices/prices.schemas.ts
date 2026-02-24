import { PriceStatusSchema } from '@listacerta/shared-types';
import { z } from 'zod';

export const productIdSchema = z.string().uuid();
export const priceIdSchema = z.string().uuid();

export const createPriceSchema = z.object({
  productId: productIdSchema,
  storeId: z.string().uuid(),
  priceCents: z.number().int().positive(),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  capturedAt: z.string().datetime().optional(),
  submittedBy: z.string().trim().min(1).nullable().optional(),
  photoUrl: z.string().url().nullable().optional(),
  status: PriceStatusSchema.optional().default('active'),
});

export const listModerationQuerySchema = z.object({
  status: PriceStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
});

export const moderatePriceSchema = z.object({
  status: PriceStatusSchema,
});

export type CreatePriceBody = z.infer<typeof createPriceSchema>;
export type ListModerationQuery = z.infer<typeof listModerationQuerySchema>;
export type ModeratePriceBody = z.infer<typeof moderatePriceSchema>;
