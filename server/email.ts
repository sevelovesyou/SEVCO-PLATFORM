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
import { db } from "./db";
import { emails } from "@shared/schema";
import type { User } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { uploadBuffer } from "./supabase";
import { simpleParser } from "mailparser";
import { getResendClient } from "./emailClient";
import type { GetReceivingEmailResponseSuccess, AttachmentData } from "resend";

const CLIENT_PLUS_ROLES = ["client", "partner", "staff", "executive", "admin"];

export function getEmailAddress(username: string): string {
  return `${username}@sevco.us`;
}

export function isClientPlus(role: string): boolean {
  return CLIENT_PLUS_ROLES.includes(role);
}

export interface EmailAttachment {
  filename: string;
  contentType: string;
  url: string;
  size: number;
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
    attachments?: Array<{ filename: string; content?: string; path?: string }>;
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
  threadId?: string | null;
  attachments?: EmailAttachment[];
}

export async function sendEmail(params: SendEmailParams, resendSend: ResendSendFn): Promise<string | null> {
  const { fromUser, to, cc = [], bcc = [], subject, html = "", text = "", replyTo, isDraft = false, threadId = null, attachments = [] } = params;

  const fromAddress = getEmailAddress(fromUser.username);
  const fromDisplay = `${fromUser.displayName || fromUser.username} <${fromAddress}>`;

  let resendEmailId: string | null = null;

  const resendAttachments: Array<{ filename: string; content?: string; path?: string }> = [];
  for (const att of attachments) {
    if (att.url.startsWith("data:")) {
      const base64Data = att.url.split(",")[1];
      if (base64Data) {
        resendAttachments.push({ filename: att.filename, content: base64Data });
      }
    } else {
      resendAttachments.push({ filename: att.filename, path: att.url });
    }
  }

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
      attachments: resendAttachments.length > 0 ? resendAttachments : undefined,
    });
    resendEmailId = result?.id ?? null;
  }

  const storedAttachments = attachments.map(a => ({ filename: a.filename, contentType: a.contentType, url: a.url, size: a.size }));

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
    attachments: storedAttachments,
    threadId: threadId ?? null,
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
    content?: string;
    url?: string;
    size?: number;
  }>;
  headers?: Record<string, string>;
  raw?: string;
}

function extractEmailAddress(raw: string): string {
  const angleMatch = raw.match(/<([^>]+)>/);
  return (angleMatch ? angleMatch[1] : raw).trim().toLowerCase();
}

async function uploadAttachmentToStorage(
  content: string,
  filename: string,
  contentType: string,
  emailId: string
): Promise<string | null> {
  try {
    const buffer = Buffer.from(content, "base64");
    const timestamp = Date.now();
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${emailId}/${timestamp}_${safeName}`;
    const url = await uploadBuffer("email-attachments", storagePath, buffer, contentType);
    if (url) {
      console.log(`[email] Uploaded attachment "${filename}" to Supabase (${buffer.length} bytes)`);
    }
    return url;
  } catch (err: any) {
    console.error(`[email] Failed to upload attachment "${filename}":`, err?.message ?? err);
    return null;
  }
}

export async function processInboundEmail(payload: ResendInboundPayload): Promise<void> {
  let {
    email_id,
    from: fromAddress = "",
    to: toAddresses = [],
    cc: ccAddresses = [],
    subject = "",
    html: payloadHtml = "",
    text: payloadText = "",
    attachments: rawAttachments = [],
    reply_to: replyTo,
  } = payload;

  console.log(`[email] processInboundEmail — email_id=${email_id}, from=${fromAddress}, to=${JSON.stringify(toAddresses)}, subject=${subject}, bodyHtml=${payloadHtml.length}ch, bodyText=${payloadText.length}ch, attachments=${rawAttachments.length}`);

  if (email_id && !payloadHtml && !payloadText) {
    console.log(`[email] Body fields empty — calling Resend Receiving API for email_id=${email_id}`);
    try {
      const resend = await getResendClient();

      const emailResult = await resend.emails.receiving.get(email_id);

      if (emailResult.error) {
        console.warn("[email] Receiving API get() error:", emailResult.error.message);
      } else if (emailResult.data) {
        const receivedData: GetReceivingEmailResponseSuccess = emailResult.data;
        payloadHtml = receivedData.html ?? "";
        payloadText = receivedData.text ?? "";
        console.log(`[email] Receiving API body — html=${payloadHtml.length}ch, text=${payloadText.length}ch`);

        if (receivedData.attachments.length > 0) {
          const attListResult = await resend.emails.receiving.attachments.list({ emailId: email_id });
          if (attListResult.error) {
            console.warn("[email] Receiving API attachments.list() error:", attListResult.error.message);
          } else if (attListResult.data) {
            const attItems: AttachmentData[] = attListResult.data.data;
            console.log(`[email] Receiving API — ${attItems.length} attachment(s) with download URLs`);
            rawAttachments = await Promise.all(
              attItems.map(async (a, idx) => {
                if (a.download_url) {
                  try {
                    const resp = await fetch(a.download_url);
                    if (resp.ok) {
                      const buffer = Buffer.from(await resp.arrayBuffer());
                      const base64Content = buffer.toString("base64");
                      console.log(`[email] Downloaded attachment "${a.filename ?? idx}" — ${buffer.length} bytes`);
                      return {
                        filename: a.filename ?? `attachment_${idx}`,
                        content_type: a.content_type,
                        content: base64Content,
                        content_id: a.content_id ?? undefined,
                        size: a.size,
                      };
                    } else {
                      console.warn(`[email] Attachment download failed (${resp.status}) for "${a.filename ?? idx}"`);
                    }
                  } catch (dlErr: unknown) {
                    const msg = dlErr instanceof Error ? dlErr.message : String(dlErr);
                    console.warn(`[email] Attachment download threw for "${a.filename ?? idx}":`, msg);
                  }
                }
                return {
                  filename: a.filename ?? `attachment_${idx}`,
                  content_type: a.content_type,
                  content_id: a.content_id ?? undefined,
                  size: a.size,
                };
              })
            );
          }
        }
      }
    } catch (apiErr: unknown) {
      const msg = apiErr instanceof Error ? apiErr.message : String(apiErr);
      console.warn("[email] Receiving API calls failed:", msg);
    }
  }

  if (!payloadHtml && !payloadText && payload.raw) {
    console.log("[email] Body still empty — attempting MIME fallback parse from raw payload");
    try {
      const rawSource = payload.raw;
      let parseInput: string | Buffer;
      const looksLikeBase64 = /^[A-Za-z0-9+/\r\n]+=*$/.test(rawSource.trim()) && !rawSource.includes(":");
      if (looksLikeBase64) {
        parseInput = Buffer.from(rawSource, "base64");
      } else {
        parseInput = rawSource;
      }
      const parsed = await simpleParser(parseInput);

      payloadHtml = (parsed.html && parsed.html !== false ? parsed.html : "") as string;
      payloadText = parsed.text ?? "";
      if (!fromAddress && parsed.from) {
        fromAddress = parsed.from.text || "";
      }
      if ((!toAddresses || toAddresses.length === 0) && parsed.to) {
        const toVal = parsed.to;
        toAddresses = Array.isArray(toVal)
          ? toVal.map((a) => a.text)
          : [toVal.text];
      }
      if (!subject && parsed.subject) {
        subject = parsed.subject;
      }

      if (parsed.attachments && parsed.attachments.length > 0) {
        rawAttachments = parsed.attachments.map((a) => ({
          filename: a.filename ?? "attachment",
          content_type: a.contentType,
          content: a.content.toString("base64"),
          content_id: a.contentId ?? undefined,
          size: a.size,
        }));
      }

      console.log(`[email] MIME parse result — html=${payloadHtml.length}ch, text=${payloadText.length}ch, attachments=${rawAttachments.length}`);
    } catch (mimeErr: any) {
      console.error("[email] MIME fallback parse failed:", mimeErr?.message ?? mimeErr);
    }
  }

  const cidMap: Record<string, string> = {};
  const uniqueId = email_id || crypto.randomUUID();

  const attachments: Array<{
    filename: string;
    contentType: string;
    url: string;
    size: number;
    contentId?: string;
  }> = [];

  for (let idx = 0; idx < rawAttachments.length; idx++) {
    const a = rawAttachments[idx];
    const hasContent = !!a.content;
    const contentType = a.content_type ?? "application/octet-stream";
    const size = a.size ?? (hasContent ? Math.ceil((a.content!.length * 3) / 4) : 0);

    let url = a.url ?? "";

    if (hasContent) {
      const uploadedUrl = await uploadAttachmentToStorage(
        a.content!,
        a.filename ?? `attachment_${idx}`,
        contentType,
        uniqueId
      );
      if (uploadedUrl) {
        url = uploadedUrl;
      }
    }

    if (a.content_id) {
      const cid = a.content_id.replace(/^<|>$/g, "");
      if (url) {
        cidMap[cid] = url;
      }
    }

    attachments.push({
      filename: a.filename ?? "",
      contentType,
      url,
      size,
      ...(a.content_id ? { contentId: a.content_id.replace(/^<|>$/g, "") } : {}),
    });
  }

  let bodyHtml = payloadHtml;
  if (bodyHtml && Object.keys(cidMap).length > 0) {
    for (const [cid, resolvedUrl] of Object.entries(cidMap)) {
      bodyHtml = bodyHtml.replace(
        new RegExp(`cid:${cid.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "gi"),
        resolvedUrl
      );
    }
    console.log(`[email] Replaced ${Object.keys(cidMap).length} CID reference(s) in HTML body`);
  }

  const bodyText = payloadText;

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

export async function logEmptyBodyEmails(): Promise<void> {
  try {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(emails)
      .where(
        and(
          eq(emails.direction, "inbound"),
          sql`(${emails.bodyHtml} IS NULL OR ${emails.bodyHtml} = '')`,
          sql`(${emails.bodyText} IS NULL OR ${emails.bodyText} = '')`
        )
      );
    const count = Number(result[0]?.count ?? 0);
    if (count > 0) {
      console.warn(`[email] BACKFILL NOTICE: ${count} inbound email(s) have empty bodies — these were received before the Receiving API fix. New inbound emails will fetch body content via resend.emails.receiving.get().`);
    } else {
      console.log("[email] All inbound emails have body content — no backfill needed.");
    }
  } catch (err: any) {
    console.error("[email] Error checking for empty-body emails:", err?.message ?? err);
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
