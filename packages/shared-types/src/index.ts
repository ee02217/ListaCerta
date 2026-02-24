import { z } from 'zod';

export const IdSchema = z.string().min(1);
export const UuidSchema = z.string().uuid();
export const IsoDateStringSchema = z.preprocess(
  (value) => (value instanceof Date ? value.toISOString() : value),
  z.string().datetime(),
);

export const ProductSourceSchema = z.enum(['OFF', 'manual']);
export const PriceStatusSchema = z.enum(['active', 'flagged']);

export const ProductSchema = z.object({
  id: UuidSchema,
  barcode: z.string().trim().min(4),
  name: z.string().trim().min(1),
  brand: z.string().trim().min(1).nullable(),
  category: z.string().trim().min(1).nullable(),
  imageUrl: z.string().url().nullable(),
  source: ProductSourceSchema,
  cachedAt: IsoDateStringSchema.nullable(),
  createdAt: IsoDateStringSchema,
  updatedAt: IsoDateStringSchema,
});

export const StoreSchema = z.object({
  id: UuidSchema,
  name: z.string().trim().min(1),
  location: z.string().trim().min(1).nullable(),
});

export const DeviceSchema = z.object({
  id: IdSchema,
  createdAt: IsoDateStringSchema,
});

export const PriceSchema = z.object({
  id: UuidSchema,
  productId: UuidSchema,
  storeId: UuidSchema,
  priceCents: z.number().int().nonnegative(),
  currency: z.string().trim().length(3),
  capturedAt: IsoDateStringSchema,
  submittedBy: IdSchema.nullable(),
  photoUrl: z.string().url().nullable(),
  status: PriceStatusSchema,
  confidenceScore: z.number().min(0).max(1).default(1),
});

export const PriceWithRelationsSchema = PriceSchema.extend({
  product: ProductSchema.optional(),
  store: StoreSchema.optional(),
  device: DeviceSchema.nullable().optional(),
});

export const ProductsArraySchema = z.array(ProductSchema);
export const StoresArraySchema = z.array(StoreSchema);
export const PricesArraySchema = z.array(PriceSchema);
export const PricesWithRelationsArraySchema = z.array(PriceWithRelationsSchema);

export const PriceByStoreSummarySchema = z.object({
  store: StoreSchema,
  bestPrice: PriceWithRelationsSchema,
});

export const PriceAggregationSchema = z.object({
  bestOverall: PriceWithRelationsSchema,
  groupedByStore: z.array(PriceByStoreSummarySchema),
  priceHistory: PricesWithRelationsArraySchema,
});

export const PriceSubmissionResultSchema = z.object({
  createdPrice: PriceWithRelationsSchema,
  bestPrice: PriceWithRelationsSchema,
});

export const ApiErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
});

export const createApiItemResponseSchema = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({
    data: schema,
  });

export const createApiListResponseSchema = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({
    data: z.array(schema),
    total: z.number().int().nonnegative().optional(),
  });

export const ProductResponseSchema = createApiItemResponseSchema(ProductSchema);
export const ProductsResponseSchema = createApiListResponseSchema(ProductSchema);
export const StoreResponseSchema = createApiItemResponseSchema(StoreSchema);
export const StoresResponseSchema = createApiListResponseSchema(StoreSchema);
export const PriceResponseSchema = createApiItemResponseSchema(PriceSchema);
export const PricesResponseSchema = createApiListResponseSchema(PriceSchema);

export const UserSchema = z.object({
  id: IdSchema,
  email: z.string().email(),
  name: z.string().min(1).optional(),
  createdAt: IsoDateStringSchema,
});

export const ListSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  createdAt: IsoDateStringSchema,
});

export const ListItemSchema = z.object({
  id: IdSchema,
  listId: IdSchema,
  title: z.string().min(1),
  done: z.boolean().default(false),
  quantity: z.number().int().positive().default(1),
});

export type ProductSource = z.infer<typeof ProductSourceSchema>;
export type PriceStatus = z.infer<typeof PriceStatusSchema>;

export type Product = z.infer<typeof ProductSchema>;
export type Store = z.infer<typeof StoreSchema>;
export type Device = z.infer<typeof DeviceSchema>;
export type Price = z.infer<typeof PriceSchema>;
export type PriceWithRelations = z.infer<typeof PriceWithRelationsSchema>;
export type PriceByStoreSummary = z.infer<typeof PriceByStoreSummarySchema>;
export type PriceAggregation = z.infer<typeof PriceAggregationSchema>;
export type PriceSubmissionResult = z.infer<typeof PriceSubmissionResultSchema>;

export type ApiError = z.infer<typeof ApiErrorSchema>;
export type ApiItemResponse<T> = { data: T };
export type ApiListResponse<T> = { data: T[]; total?: number };

export type User = z.infer<typeof UserSchema>;
export type List = z.infer<typeof ListSchema>;
export type ListItem = z.infer<typeof ListItemSchema>;
