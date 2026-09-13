// Pickup deadline calculation logic, per PRD section 7.5.
//
// - Prepaid orders: no expiration deadline applied.
// - Unpaid orders: default 7-day expiration deadline calculated starting
//   from notification_date, automatically skipping store closed days
//   (Mondays and Tuesdays).
// - Staff can manually extend/override the calculated date.

const STORE_CLOSED_WEEKDAYS = new Set([1, 2]); // 0=Sun ... 1=Mon, 2=Tue

const DEFAULT_UNPAID_HOLD_DAYS = 7;

function isStoreOpenDay(date: Date): boolean {
  return !STORE_CLOSED_WEEKDAYS.has(date.getUTCDay());
}

function addOpenDays(start: Date, openDaysToAdd: number): Date {
  const result = new Date(start);
  let remaining = openDaysToAdd;
  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    if (isStoreOpenDay(result)) {
      remaining -= 1;
    }
  }
  return result;
}

/**
 * Computes the pickup expiration deadline for a line item.
 * Returns null for prepaid items (no expiration applied).
 */
export function calculateExpirationDate(opts: {
  isPrepaid: boolean;
  notificationDate: Date | string;
  holdDays?: number;
}): Date | null {
  if (opts.isPrepaid) return null;
  const notificationDate =
    typeof opts.notificationDate === "string"
      ? new Date(opts.notificationDate)
      : opts.notificationDate;
  return addOpenDays(notificationDate, opts.holdDays ?? DEFAULT_UNPAID_HOLD_DAYS);
}

/** Manual staff override: extend an existing (or newly calculated) deadline by N days. */
export function extendExpirationDate(currentDeadline: Date | string, extraDays: number): Date {
  const base = typeof currentDeadline === "string" ? new Date(currentDeadline) : currentDeadline;
  return addOpenDays(base, extraDays);
}

export function isExpired(expirationDate: Date | string | null, asOf: Date = new Date()): boolean {
  if (!expirationDate) return false;
  const d = typeof expirationDate === "string" ? new Date(expirationDate) : expirationDate;
  return d.getTime() < asOf.getTime();
}

export { DEFAULT_UNPAID_HOLD_DAYS };
