import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, or, ilike, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { orderInputSchema } from "@/lib/domain/schemas";
import type { OrderStatus } from "@/lib/domain/status";

// GET /api/orders — staff lookup & management view (PRD 3.4), and the
// back-office sortable table / kanban data source (PRD 7.3).
// Filters: ?status=, ?q= (customer name/email/phone), ?preorderOnly=1
export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status") as OrderStatus | null;
  const q = request.nextUrl.searchParams.get("q")?.trim();

  const orders = await db.query.orders.findMany({
    where: and(
      status ? eq(schema.orders.status, status) : undefined,
      q
        ? or(
            ilike(schema.customers.name, `%${q}%`),
            ilike(schema.customers.email, `%${q}%`),
            ilike(schema.customers.phone, `%${q}%`)
          )
        : undefined
    ),
    with: {
      customer: true,
      items: { with: { book: true } },
    },
    orderBy: [desc(schema.orders.createdAt)],
    limit: 200,
  });

  return NextResponse.json({ orders });
}

// POST /api/orders — order confirmation & submission (PRD 3.3)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = orderInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;

  let customerId = input.customerId;
  if (!customerId) {
    if (!input.customer) {
      return NextResponse.json({ error: "customerId or customer is required" }, { status: 400 });
    }
    const [customer] = await db
      .insert(schema.customers)
      .values({
        name: input.customer.name,
        email: input.customer.email || null,
        phone: input.customer.phone || null,
      })
      .returning();
    customerId = customer.id;
  }

  const [order] = await db
    .insert(schema.orders)
    .values({
      customerId,
      isPrepaid: input.isPrepaid,
      notes: input.notes || null,
    })
    .returning();

  for (const item of input.items) {
    let bookId = item.bookId;

    if (!bookId) {
      if (!item.title || !item.binding) {
        continue; // schema requires this via UI validation; defensive skip here
      }
      // De-dupe by ISBN-13 when we have one from lookup; otherwise create fresh.
      let existingBook = item.isbn13
        ? (
            await db
              .select()
              .from(schema.books)
              .where(eq(schema.books.isbn13, item.isbn13))
              .limit(1)
          )[0]
        : undefined;

      if (!existingBook) {
        [existingBook] = await db
          .insert(schema.books)
          .values({
            title: item.title,
            binding: item.binding,
            isbn13: item.isbn13 || null,
            thumbnailUrl: item.thumbnailUrl || null,
            retailPrice: item.unitPrice ? String(item.unitPrice) : null,
            genre: item.genre || null,
          })
          .returning();

        if (item.author) {
          let [author] = await db
            .select()
            .from(schema.authors)
            .where(eq(schema.authors.name, item.author))
            .limit(1);
          if (!author) {
            [author] = await db.insert(schema.authors).values({ name: item.author }).returning();
          }
          await db.insert(schema.bookAuthors).values({ bookId: existingBook.id, authorId: author.id });
        }
      }
      bookId = existingBook.id;
    }

    const quantity = item.quantity;
    const unitPrice = item.unitPrice;
    const subtotal = quantity * unitPrice;
    // Preorders and prepaid orders skip the Pending line-item state (PRD 4.2).
    const initialStatus = item.isPreorder || input.isPrepaid ? "approved" : "pending";

    await db.insert(schema.orderItems).values({
      orderId: order.id,
      bookId,
      quantity,
      unitPrice: String(unitPrice),
      subtotal: String(subtotal),
      isPreorder: item.isPreorder,
      status: initialStatus,
      notes: item.notes || null,
    });
  }

  await db
    .update(schema.customers)
    .set({ totalOrders: sql`${schema.customers.totalOrders} + 1` })
    .where(eq(schema.customers.id, customerId));

  const full = await db.query.orders.findFirst({
    where: eq(schema.orders.id, order.id),
    with: { customer: true, items: { with: { book: true } } },
  });

  return NextResponse.json({ order: full }, { status: 201 });
}
