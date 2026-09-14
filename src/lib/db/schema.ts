import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  numeric,
  boolean,
  timestamp,
  pgEnum,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const bindingEnum = pgEnum("binding", ["Paperback", "Hardcover"]);

export const userRoleEnum = pgEnum("user_role", ["staff", "superadmin"]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "submitted_to_supplier",
  "partially_received",
  "ready_for_pickup",
  "completed",
  "cancelled",
]);

export const lineItemStatusEnum = pgEnum("line_item_status", [
  "pending",
  "approved",
  "ordered",
  "backordered",
  "received",
  "fulfilled",
  "cancelled",
]);

// 5.2.1 Customers
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  totalOrders: integer("total_orders").notNull().default(0),
  fulfilledOrders: integer("fulfilled_orders").notNull().default(0),
  abandonedOrders: integer("abandoned_orders").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 5.2.2 Authors
export const authors = pgTable("authors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
});

// 5.2.3 Books
export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 512 }).notNull(),
  genre: varchar("genre", { length: 120 }),
  binding: bindingEnum("binding").notNull(),
  isbn13: varchar("isbn_13", { length: 20 }),
  thumbnailUrl: text("thumbnail_url"),
  retailPrice: numeric("retail_price", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 5.2.4 Book_Authors (junction table)
export const bookAuthors = pgTable(
  "book_authors",
  {
    bookId: integer("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    authorId: integer("author_id")
      .notNull()
      .references(() => authors.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.bookId, t.authorId] })]
);

// 5.2.5 Orders
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "restrict" }),
  status: orderStatusEnum("status").notNull().default("pending"),
  isPrepaid: boolean("is_prepaid").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 5.2.6 Order_Items
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  bookId: integer("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull().default("0"),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  isPreorder: boolean("is_preorder").notNull().default(false),
  status: lineItemStatusEnum("status").notNull().default("pending"),
  notificationDate: timestamp("notification_date", { withTimezone: true }),
  expirationDate: timestamp("expiration_date", { withTimezone: true }),
  notes: text("notes"),
});

// Featured Readers — a person (customer or employee; the distinction is
// just a display label, not a link to the `customers` table) who leaves
// long-form book recommendations. Deliberately decoupled from `customers`
// so entering one never touches real customer/order data or its metrics.
export const featuredReaders = pgTable("featured_readers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("Customer"), // e.g. "Customer" | "Employee" — free text, not a strict enum
  bio: varchar("bio", { length: 255 }), // optional, e.g. "Store manager" / "Regular since 2019"
  city: varchar("city", { length: 120 }),
  state: varchar("state", { length: 60 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// One long-form recommendation from one featured reader for one book —
// this is the in-store "Featured Reader" shelf (books we stock or order
// specifically for that display), not the algorithmic Recommendations
// page. Multiple readers can each recommend the same book for different
// reasons — that's the point, so there's no uniqueness constraint on
// (reader, book). featuredMonth/featuredYear track which display period
// this particular pick belongs to, since the same reader can be featured
// again later with different books.
export const bookRecommendations = pgTable("book_recommendations", {
  id: serial("id").primaryKey(),
  featuredReaderId: integer("featured_reader_id")
    .notNull()
    .references(() => featuredReaders.id, { onDelete: "cascade" }),
  bookId: integer("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  blurb: text("blurb").notNull(),
  featuredMonth: integer("featured_month"), // 1-12
  featuredYear: integer("featured_year"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- Auth ---
// Staff accounts. Restricted to @<domain> emails at creation time (see
// src/lib/auth/constants.ts / ALLOWED_EMAIL_DOMAIN) — enforced in
// application code, not the database, so the domain is easy to change
// later without a migration.
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("staff"),
  // True immediately after a superadmin creates the account (or resets its
  // password) — forces a password change before the rest of the app is
  // reachable. See src/proxy.ts.
  mustChangePassword: boolean("must_change_password").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// One row per logged-in browser. The cookie holds a random opaque token;
// only its SHA-256 hash is stored here, so a leaked database dump alone
// can't be replayed as a valid session cookie (see src/lib/auth/password.ts
// hashToken, and src/proxy.ts which is the only place this table is read).
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Short-lived "forgot password" codes, emailed to the user. Same
// hash-before-storing approach as sessions above.
export const passwordResetCodes = pgTable("password_reset_codes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  codeHash: varchar("code_hash", { length: 64 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- Relations ---

export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
}));

export const booksRelations = relations(books, ({ many }) => ({
  bookAuthors: many(bookAuthors),
  orderItems: many(orderItems),
  recommendations: many(bookRecommendations),
}));

export const authorsRelations = relations(authors, ({ many }) => ({
  bookAuthors: many(bookAuthors),
}));

export const bookAuthorsRelations = relations(bookAuthors, ({ one }) => ({
  book: one(books, { fields: [bookAuthors.bookId], references: [books.id] }),
  author: one(authors, { fields: [bookAuthors.authorId], references: [authors.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  book: one(books, { fields: [orderItems.bookId], references: [books.id] }),
}));

export const featuredReadersRelations = relations(featuredReaders, ({ many }) => ({
  recommendations: many(bookRecommendations),
}));

export const bookRecommendationsRelations = relations(bookRecommendations, ({ one }) => ({
  featuredReader: one(featuredReaders, {
    fields: [bookRecommendations.featuredReaderId],
    references: [featuredReaders.id],
  }),
  book: one(books, { fields: [bookRecommendations.bookId], references: [books.id] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  passwordResetCodes: many(passwordResetCodes),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const passwordResetCodesRelations = relations(passwordResetCodes, ({ one }) => ({
  user: one(users, { fields: [passwordResetCodes.userId], references: [users.id] }),
}));
