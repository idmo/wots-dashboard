import "server-only";
import {
  createHash,
  randomBytes,
  randomInt,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

// Password hashing uses Node's built-in scrypt rather than a package like
// bcrypt — same reasoning as choosing Drizzle over Prisma elsewhere in this
// project (see README "Stack decisions"): no native addon to compile/
// download, just the standard library. Stored as "<saltHex>:<hashHex>".
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  const storedKey = Buffer.from(hashHex, "hex");
  // Buffers of different lengths would throw in timingSafeEqual.
  if (derivedKey.length !== storedKey.length) return false;
  return timingSafeEqual(derivedKey, storedKey);
}

// Human-typeable temporary password for a newly created (or admin-reset)
// account. Avoids visually ambiguous characters (0/O, 1/l/I) since staff
// may be reading this off a phone screen or a printed slip.
const PASSWORD_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

export function generateDefaultPassword(length = 12): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
  }
  return out;
}

// 6-digit numeric "forgot password" code — easy to read out of an email
// and type back in.
export function generateResetCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

// Used for session tokens and reset codes, NOT passwords (see hashPassword
// above). A fast, unsalted SHA-256 is fine here because the input already
// has plenty of entropy (a random session token) or is short-lived and
// single-use (a reset code) — the threat scrypt's slowness defends
// against (offline brute-forcing a human-chosen password) doesn't apply.
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
