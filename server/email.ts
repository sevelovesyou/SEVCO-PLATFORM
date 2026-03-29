/**
 * SEVCO Email Module — server/email.ts
 *
 * PREREQUISITES (manual setup required before inbound email works end-to-end):
 *
 * 1. Resend domain verification: sevco.us must be verified in Resend dashboard
 *    (DNS: SPF, DKIM records added to your domain registrar).
 *
 * 2. Resend inbound routing: In the Resend dashboard → Inbound → Create a route
 *    that catches *@sevco.us and points to https://sevco.us/api/email/inbound.
 *    Add MX record: sevco.us MX 10 inbound.resend.com
 *
 * 3. Environment variables:
 *    - RESEND_WEBHOOK_SECRET — signing secret from Resend dashboard (Inbound → Signing secret)
 *    - SITE_URL — base URL already set; used for reply links
 */

import crypto from "crypto";
import { storage } from "./storage";
import type { User } from "@shared/schema";

const CLIENT_PLUS_ROLES = ["client", "partner", "staff", "executive", "admin"];

export function getEmailAddress(username: string): string {
  return `${username}@sevco.us`;
}

export function isClientPlus(role: string): boolean {
  return CLIENT_PLUS_ROLES.includes(role);
}

export interface ResendSendFn {
  (payload: {
    from: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    reply_to?: string;
    subject: string;
    html?: string;
    text?: string;
  }): Promise<{ id?: string | null }>;
}

interface SendEmailParams {
  fromUser: User;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  isDraft?: boolean;
}

export async function sendEmail(params: SendEmailParams, resendSend: ResendSendFn): Promise<string | null> {
  const { fromUser, to, cc = [], bcc = [], subject, html = "", text = "", replyTo, isDraft = false } = params;

  const fromAddress = getEmailAddress(fromUser.username);
  const fromDisplay = `${fromUser.displayName || fromUser.username} <${fromAddress}>`;

  let resendEmailId: string | null = null;

  if (!isDraft) {
    const result = await resendSend({
      from: fromDisplay,
      to,
      cc: cc.length > 0 ? cc : undefined,
      bcc: bcc.length > 0 ? bcc : undefined,
      reply_to: replyTo,
      subject,
      html: html || undefined,
      text: text || undefined,
    });
    resendEmailId = result?.id ?? null;
  }

  await storage.createEmail({
    userId: fromUser.id,
    resendEmailId,
    direction: "outbound",
    fromAddress,
    toAddresses: to,
    ccAddresses: cc,
    bccAddresses: bcc,
    replyTo: replyTo ?? null,
    subject,
    bodyHtml: html,
    bodyText: text,
    folder: isDraft ? "drafts" : "sent",
    isRead: true,
    isStarred: false,
    attachments: [],
    threadId: null,
  });

  return resendEmailId;
}

export interface ResendInboundPayload {
  email_id?: string;
  from?: string;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  reply_to?: string;
  subject?: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    id?: string;
    filename?: string;
    content_type?: string;
    content_disposition?: string;
    content_id?: string;
    url?: string;
    size?: number;
  }>;
  headers?: Record<string, string>;
}

function extractEmailAddress(raw: string): string {
  const angleMatch = raw.match(/<([^>]+)>/);
  return (angleMatch ? angleMatch[1] : raw).trim().toLowerCase();
}

export async function processInboundEmail(payload: ResendInboundPayload): Promise<void> {
  const {
    email_id,
    from: fromAddress = "",
    to: toAddresses = [],
    cc: ccAddresses = [],
    subject = "",
    html: bodyHtml = "",
    text: bodyText = "",
    attachments: rawAttachments = [],
    reply_to: replyTo,
  } = payload;

  console.log(`[email] processInboundEmail — email_id=${email_id}, from=${fromAddress}, to=${JSON.stringify(toAddresses)}, subject=${subject}`);

  const attachments = rawAttachments.map((a) => ({
    filename: a.filename ?? "",
    contentType: a.content_type ?? "",
    url: a.url ?? (a.id ? `resend:attachment:${a.id}` : ""),
    size: a.size ?? 0,
  }));

  for (const recipient of toAddresses) {
    const addr = extractEmailAddress(recipient);
    const match = addr.match(/^(.+?)@sevco\.us$/i);
    if (!match) {
      console.log(`[email] Recipient ${recipient} (parsed: ${addr}) is not a @sevco.us address — skipping`);
      continue;
    }
    const username = match[1].toLowerCase();

    const user = await storage.getUserByUsername(username);
    if (!user) {
      console.log(`[email] No user found for ${username}@sevco.us — skipping`);
      continue;
    }

    if (!isClientPlus(user.role)) {
      console.log(`[email] User ${username} is not Client+ (role: ${user.role}) — skipping`);
      continue;
    }

    if (email_id) {
      const existing = await storage.getEmailByResendIdForUser(user.id, email_id);
      if (existing) {
        console.log(`[email] Skipping duplicate inbound email ${email_id} for user ${username}`);
        continue;
      }
    }

    await storage.createEmail({
      userId: user.id,
      resendEmailId: email_id ?? null,
      direction: "inbound",
      fromAddress,
      toAddresses,
      ccAddresses,
      bccAddresses: [],
      replyTo: replyTo ?? null,
      subject,
      bodyHtml,
      bodyText,
      folder: "inbox",
      isRead: false,
      isStarred: false,
      attachments,
      threadId: null,
    });

    console.log(`[email] Stored inbound email for ${username} (id: ${email_id})`);
  }
}

export interface WebhookHeaders {
  svixId?: string;
  svixTimestamp?: string;
  svixSignature?: string;
  resendSignature?: string;
}

const SVIX_TIMESTAMP_TOLERANCE_SECONDS = 300;

export function verifyResendWebhookSignature(rawBody: Buffer, headers: WebhookHeaders): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[email] RESEND_WEBHOOK_SECRET not set — rejecting webhook request (fail-closed)");
    return false;
  }

  const secretBytes = secret.startsWith("whsec_")
    ? Buffer.from(secret.slice(6), "base64")
    : Buffer.from(secret);

  const { svixId, svixTimestamp, svixSignature } = headers;

  if (svixId && svixTimestamp && svixSignature) {
    const ts = parseInt(svixTimestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    if (isNaN(ts) || Math.abs(now - ts) > SVIX_TIMESTAMP_TOLERANCE_SECONDS) {
      console.warn(`[email] Svix timestamp out of tolerance: ts=${svixTimestamp}, now=${now}, diff=${Math.abs(now - ts)}s`);
      return false;
    }

    try {
      const signedContent = `${svixId}.${svixTimestamp}.${rawBody.toString()}`;
      const expected = crypto
        .createHmac("sha256", secretBytes)
        .update(signedContent)
        .digest("base64");

      const signatures = svixSignature.split(" ");
      for (const sig of signatures) {
        const b64 = sig.startsWith("v1,") ? sig.slice(3) : sig;
        try {
          if (crypto.timingSafeEqual(Buffer.from(expected, "base64"), Buffer.from(b64, "base64"))) {
            console.log("[email] Svix webhook signature verified successfully");
            return true;
          }
        } catch {
          continue;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  const { resendSignature } = headers;
  if (!resendSignature) return false;
  const sig = resendSignature.includes(",") ? resendSignature.split(",").pop()! : resendSignature;
  try {
    const expected = crypto.createHmac("sha256", secretBytes).update(rawBody).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(sig, "hex"));
  } catch {
    return false;
  }
}
