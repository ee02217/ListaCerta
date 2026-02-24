import { z } from 'zod';

export const IdSchema = z.string().min(1);
export const IsoDateStringSchema = z.string().datetime();

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

export type User = z.infer<typeof UserSchema>;
export type List = z.infer<typeof ListSchema>;
export type ListItem = z.infer<typeof ListItemSchema>;
