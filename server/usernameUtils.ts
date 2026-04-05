import { storage } from "./storage";

export const STATIC_RESERVED_USERNAMES = new Set([
  "admin", "root", "api", "www", "sevco", "mail", "noreply", "info",
  "abuse", "postmaster", "webmaster", "hostmaster", "security", "billing",
  "sales", "marketing", "contact", "team", "staff", "bot", "system",
]);

export async function isUsernameReserved(username: string): Promise<boolean> {
  const lower = username.toLowerCase();
  if (STATIC_RESERVED_USERNAMES.has(lower)) return true;
  const mailboxes = await storage.getSystemMailboxes();
  for (const mb of mailboxes) {
    if (!mb.isActive) continue;
    const prefix = mb.address.split("@")[0].toLowerCase();
    if (prefix === lower) return true;
  }
  return false;
}
