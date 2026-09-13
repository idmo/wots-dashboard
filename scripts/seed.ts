// Seed script — realistic demo data so the app is usable end-to-end without
// real Ingram/Basil access. Run with `npm run db:seed`.
//
// Book cover URLs use OpenLibrary's predictable `covers.openlibrary.org/b/isbn/`
// pattern (no API call needed to construct them) against well-known ISBN-13s;
// treat them as illustrative demo data, not verified catalog data.
import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "../src/lib/db";
import { calculateExpirationDate } from "../src/lib/domain/deadlines";
import type { LineItemStatus } from "../src/lib/domain/status";

function coverUrl(isbn13: string) {
  return `https://covers.openlibrary.org/b/isbn/${isbn13}-M.jpg`;
}

const BOOKS = [
  { title: "The Hobbit", author: "J.R.R. Tolkien", genre: "Fantasy", binding: "Paperback" as const, isbn13: "9780547928227", price: 16.99 },
  { title: "Dune", author: "Frank Herbert", genre: "Science Fiction", binding: "Paperback" as const, isbn13: "9780441013593", price: 18.0 },
  { title: "Pride and Prejudice", author: "Jane Austen", genre: "Classics", binding: "Paperback" as const, isbn13: "9780141439518", price: 9.99 },
  { title: "The Great Gatsby", author: "F. Scott Fitzgerald", genre: "Classics", binding: "Paperback" as const, isbn13: "9780743273565", price: 15.0 },
  { title: "1984", author: "George Orwell", genre: "Science Fiction", binding: "Paperback" as const, isbn13: "9780451524935", price: 9.99 },
  { title: "To Kill a Mockingbird", author: "Harper Lee", genre: "Classics", binding: "Paperback" as const, isbn13: "9780061120084", price: 16.99 },
  { title: "The Catcher in the Rye", author: "J.D. Salinger", genre: "Classics", binding: "Paperback" as const, isbn13: "9780316769488", price: 17.0 },
  { title: "Beloved", author: "Toni Morrison", genre: "Literary Fiction", binding: "Paperback" as const, isbn13: "9781400033416", price: 17.0 },
  { title: "Educated", author: "Tara Westover", genre: "Memoir", binding: "Hardcover" as const, isbn13: "9780399590504", price: 28.0 },
  { title: "Where the Crawdads Sing", author: "Delia Owens", genre: "Literary Fiction", binding: "Paperback" as const, isbn13: "9780735219090", price: 18.0 },
  { title: "The Very Hungry Caterpillar", author: "Eric Carle", genre: "Children's", binding: "Hardcover" as const, isbn13: "9780399226908", price: 12.99 },
  { title: "Sapiens", author: "Yuval Noah Harari", genre: "Nonfiction", binding: "Paperback" as const, isbn13: "9780062316097", price: 24.99 },
  { title: "The Song of Achilles", author: "Madeline Miller", genre: "Fantasy", binding: "Paperback" as const, isbn13: "9780062060624", price: 17.99 },
  { title: "Circe", author: "Madeline Miller", genre: "Fantasy", binding: "Hardcover" as const, isbn13: "9780316556347", price: 28.0 },
  { title: "Fourth Wing", author: "Rebecca Yarros", genre: "Fantasy", binding: "Hardcover" as const, isbn13: "9781649374042", price: 29.99 },
  { title: "Iron Flame", author: "Rebecca Yarros", genre: "Fantasy", binding: "Hardcover" as const, isbn13: "9781649374080", price: 29.99 },
];

const CUSTOMERS = [
  { name: "Maria Alvarez", email: "maria.alvarez@example.com", phone: "925-555-0134" },
  { name: "James Nguyen", email: "james.nguyen@example.com", phone: "925-555-0198" },
  { name: "Priya Shah", email: "priya.shah@example.com", phone: "510-555-0155" },
  { name: "Tom Baker", email: "tom.baker@example.com", phone: "925-555-0177" },
  { name: "Lena Cho", email: "lena.cho@example.com", phone: "510-555-0121" },
  { name: "Derek Long", email: null, phone: "925-555-0111" },
  { name: "Sofia Martins", email: "sofia.martins@example.com", phone: "925-555-0166" },
  { name: "Wes Patterson", email: "wes.patterson@example.com", phone: null },
];

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log("Clearing existing data…");
  await db.delete(schema.orderItems);
  await db.delete(schema.orders);
  await db.delete(schema.bookAuthors);
  await db.delete(schema.books);
  await db.delete(schema.authors);
  await db.delete(schema.customers);

  console.log("Seeding authors & books…");
  const bookIds: { id: number; isbn13: string; price: number }[] = [];
  for (const b of BOOKS) {
    let [author] = await db.select().from(schema.authors).where(eq(schema.authors.name, b.author)).limit(1);
    if (!author) [author] = await db.insert(schema.authors).values({ name: b.author }).returning();

    const [book] = await db
      .insert(schema.books)
      .values({
        title: b.title,
        genre: b.genre,
        binding: b.binding,
        isbn13: b.isbn13,
        thumbnailUrl: coverUrl(b.isbn13),
        retailPrice: String(b.price),
      })
      .returning();

    await db.insert(schema.bookAuthors).values({ bookId: book.id, authorId: author.id });
    bookIds.push({ id: book.id, isbn13: b.isbn13, price: b.price });
  }

  console.log("Seeding customers…");
  const customerIds: number[] = [];
  for (const c of CUSTOMERS) {
    const [customer] = await db.insert(schema.customers).values(c).returning();
    customerIds.push(customer.id);
  }

  console.log("Seeding orders…");

  type ItemPlan = { status: LineItemStatus; isPreorder?: boolean; expiredHold?: boolean };
  type OrderPlan = { customerIdx: number; daysAgo: number; isPrepaid: boolean; items: ItemPlan[]; notes?: string };

  const ORDER_PLANS: OrderPlan[] = [
    { customerIdx: 0, daysAgo: 1, isPrepaid: false, items: [{ status: "pending" }] },
    { customerIdx: 1, daysAgo: 2, isPrepaid: true, items: [{ status: "approved" }, { status: "approved" }] },
    { customerIdx: 2, daysAgo: 3, isPrepaid: false, items: [{ status: "ordered" }] },
    { customerIdx: 3, daysAgo: 4, isPrepaid: false, items: [{ status: "backordered" }, { status: "ordered" }] },
    { customerIdx: 4, daysAgo: 5, isPrepaid: false, items: [{ status: "received" }], notes: "Call on arrival" },
    { customerIdx: 5, daysAgo: 6, isPrepaid: true, items: [{ status: "received" }] },
    { customerIdx: 0, daysAgo: 10, isPrepaid: false, items: [{ status: "received", expiredHold: true }], notes: "Customer paid deposit at register" },
    { customerIdx: 6, daysAgo: 12, isPrepaid: false, items: [{ status: "fulfilled" }] },
    { customerIdx: 7, daysAgo: 14, isPrepaid: true, items: [{ status: "fulfilled" }, { status: "fulfilled" }] },
    { customerIdx: 2, daysAgo: 18, isPrepaid: false, items: [{ status: "cancelled" }] },
    { customerIdx: 3, daysAgo: 20, isPrepaid: false, items: [{ status: "fulfilled" }] },
    { customerIdx: 4, daysAgo: 1, isPrepaid: true, items: [{ status: "approved", isPreorder: true }], notes: "Preordering next release" },
    { customerIdx: 1, daysAgo: 0, isPrepaid: false, items: [{ status: "pending", isPreorder: true }] },
    { customerIdx: 5, daysAgo: 8, isPrepaid: false, items: [{ status: "ordered" }, { status: "received" }] },
    { customerIdx: 7, daysAgo: 25, isPrepaid: false, items: [{ status: "fulfilled" }] },
  ];

  for (const plan of ORDER_PLANS) {
    const customerId = customerIds[plan.customerIdx];
    const createdAt = daysAgo(plan.daysAgo);

    const [order] = await db
      .insert(schema.orders)
      .values({
        customerId,
        isPrepaid: plan.isPrepaid,
        notes: plan.notes ?? null,
        createdAt,
        updatedAt: createdAt,
      })
      .returning();

    let anyFulfilled = false;
    let anyCancelled = false;

    for (const itemPlan of plan.items) {
      const book = pick(bookIds);
      const quantity = 1 + Math.floor(Math.random() * 2);

      let notificationDate: Date | null = null;
      let expirationDate: Date | null = null;
      if (itemPlan.status === "received" || itemPlan.status === "fulfilled") {
        notificationDate = itemPlan.expiredHold ? daysAgo(14) : daysAgo(1);
        expirationDate = calculateExpirationDate({
          isPrepaid: plan.isPrepaid,
          notificationDate,
        });
      }

      await db.insert(schema.orderItems).values({
        orderId: order.id,
        bookId: book.id,
        quantity,
        unitPrice: String(book.price),
        subtotal: String(book.price * quantity),
        isPreorder: itemPlan.isPreorder ?? false,
        status: itemPlan.status,
        notificationDate,
        expirationDate,
      });

      if (itemPlan.status === "fulfilled") anyFulfilled = true;
      if (itemPlan.status === "cancelled") anyCancelled = true;
    }

    // Roll up a top-level order status matching the seeded line items.
    const statuses = plan.items.map((i) => i.status);
    let orderStatus: (typeof schema.orders.$inferInsert)["status"] = "pending";
    if (statuses.every((s) => s === "fulfilled")) orderStatus = "completed";
    else if (statuses.every((s) => s === "cancelled")) orderStatus = "cancelled";
    else if (statuses.every((s) => s === "received" || s === "fulfilled")) orderStatus = "ready_for_pickup";
    else if (statuses.some((s) => s === "received" || s === "fulfilled")) orderStatus = "partially_received";
    else if (statuses.every((s) => s === "pending")) orderStatus = "pending";
    else orderStatus = "submitted_to_supplier";

    await db.update(schema.orders).set({ status: orderStatus }).where(eq(schema.orders.id, order.id));

    await db
      .update(schema.customers)
      .set({
        totalOrders: sql`${schema.customers.totalOrders} + 1`,
        fulfilledOrders: anyFulfilled
          ? sql`${schema.customers.fulfilledOrders} + 1`
          : schema.customers.fulfilledOrders,
        abandonedOrders: anyCancelled
          ? sql`${schema.customers.abandonedOrders} + 1`
          : schema.customers.abandonedOrders,
      })
      .where(eq(schema.customers.id, customerId));
  }

  console.log(`Seeded ${BOOKS.length} books, ${CUSTOMERS.length} customers, ${ORDER_PLANS.length} orders.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
