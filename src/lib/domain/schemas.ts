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

// PATCH /api/order-items/[id] — staff update a single line item's status
// and/or its unit price (e.g. filling in the correct published price for
// a preorder/prepaid item once looked up). At least one field is required.
export const orderItemUpdateSchema = z
  .object({
    status: z.enum(LINE_ITEM_STATUSES).optional(),
    unitPrice: z.number().nonnegative().optional(),
  })
  .refine((data) => data.status !== undefined || data.unitPrice !== undefined, {
    message: "Provide status and/or unitPrice",
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

// PATCH /api/customers/[id] — back-office data cleanup (fix a typo'd name,
// add a missed email/phone). Same shape as creation.
export const customerUpdateSchema = customerInputSchema;

// PATCH /api/books/[id] — back-office catalog cleanup: fix a misspelled
// title/author, or rerun the OpenLibrary lookup and correct the price.
// `authors` replaces the book's author links entirely (comma-separated
// names in the UI, split client-side) — the rest of the app only ever
// deals in a single author string, but this keeps parity with the
// underlying many-to-many schema instead of forcing one author.
export const bookUpdateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  authors: z.array(z.string().min(1)).default([]),
  genre: z.string().optional(),
  binding: z.enum(["Paperback", "Hardcover"]),
  isbn13: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  retailPrice: z.number().nonnegative().optional(),
});

// PATCH /api/featured-readers/[id] — same shape as creation.
export const featuredReaderUpdateSchema = featuredReaderInputSchema;

// PATCH /api/book-recommendations/[id] — correct a blurb or move a pick to
// a different display period. The book/reader link isn't editable here —
// delete and re-add the recommendation if it's tied to the wrong book.
export const bookRecommendationUpdateSchema = z.object({
  blurb: z.string().min(1, "Say a little about why you recommend it"),
  featuredMonth: z.number().int().min(1).max(12).optional(),
  featuredYear: z.number().int().min(2000).max(2100).optional(),
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
