import { z } from "zod";
import { LINE_ITEM_STATUSES } from "./status";

export const customerInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
});

export const orderItemInputSchema = z.object({
  bookId: z.number().int().positive().optional(),
  // Manual entry fields, used when bookId is not supplied (catalog lookup skipped).
  title: z.string().optional(),
  author: z.string().optional(),
  binding: z.enum(["Paperback", "Hardcover"]).optional(),
  isbn13: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  genre: z.string().optional(),
  unitPrice: z.number().nonnegative().default(0),
  quantity: z.number().int().positive().default(1),
  isPreorder: z.boolean().default(false),
  notes: z.string().optional(),
});

export const orderInputSchema = z.object({
  customerId: z.number().int().positive().optional(),
  customer: customerInputSchema.optional(),
  isPrepaid: z.boolean().default(false),
  notes: z.string().optional(),
  items: z.array(orderItemInputSchema).min(1, "Add at least one book"),
});

export const lineItemStatusUpdateSchema = z.object({
  status: z.enum(LINE_ITEM_STATUSES),
});

export const bulkLineItemStatusUpdateSchema = z.object({
  orderItemIds: z.array(z.number().int().positive()).min(1),
  status: z.enum(LINE_ITEM_STATUSES),
});

export const extendDeadlineSchema = z.object({
  orderItemId: z.number().int().positive(),
  extraDays: z.number().int().positive(),
});

export const featuredReaderInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().optional(),
  bio: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});

export const bookRecommendationInputSchema = z.object({
  featuredReaderId: z.number().int().positive(),
  blurb: z.string().min(1, "Say a little about why you recommend it"),
  bookId: z.number().int().positive().optional(),
  // Which display period (the in-store "Featured Reader" shelf) this pick
  // belongs to. Defaults to the current month/year if not supplied.
  featuredMonth: z.number().int().min(1).max(12).optional(),
  featuredYear: z.number().int().min(2000).max(2100).optional(),
  // Manual entry fields, used when bookId is not supplied — same shape as
  // an order line item's manual book fields.
  title: z.string().optional(),
  author: z.string().optional(),
  binding: z.enum(["Paperback", "Hardcover"]).optional(),
  isbn13: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  genre: z.string().optional(),
});
