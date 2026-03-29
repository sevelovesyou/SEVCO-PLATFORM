// Resend integration - uses Replit connector for credentials
import { Resend } from 'resend';
import type { FinanceInvoice } from "@shared/schema";

const FROM_EMAIL = "noreply@sevco.us";

async function getCredentials(): Promise<{ apiKey: string; source: string }> {
  const fallbackKey = process.env.RESEND_API_KEY;

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!hostname) {
    console.warn('[emailClient] REPLIT_CONNECTORS_HOSTNAME is not set — skipping connector lookup');
  } else if (!xReplitToken) {
    console.warn('[emailClient] No REPL_IDENTITY or WEB_REPL_RENEWAL token found — skipping connector lookup');
  } else {
    try {
      const url = 'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend';
      console.log('[emailClient] Fetching Resend credentials from connector:', hostname);
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'X-Replit-Token': xReplitToken,
        },
      });
      if (!res.ok) {
        const body = await res.text();
        console.error(`[emailClient] Resend connector responded HTTP ${res.status}. Body: ${body.slice(0, 300)}`);
      } else {
        const data = await res.json();
        const items: any[] = data.items ?? [];
        if (items.length === 0) {
          console.error('[emailClient] Resend connector returned 0 connections. Is the Resend integration installed and configured?');
        } else {
          const connectionSettings = items[0];
          const apiKey = connectionSettings?.settings?.api_key;
          if (apiKey) {
            console.log('[emailClient] Resend API key retrieved from connector (connection id:', connectionSettings?.id ?? 'unknown', ')');
            return { apiKey, source: 'connector' };
          } else {
            console.error('[emailClient] Resend connector: api_key missing from connection settings. Keys present:', Object.keys(connectionSettings?.settings ?? {}));
          }
        }
      }
    } catch (connErr: any) {
      console.error('[emailClient] Resend connector lookup threw an error:', connErr?.message ?? connErr);
    }
  }

  if (fallbackKey) {
    console.log('[emailClient] Using RESEND_API_KEY environment variable as fallback');
    return { apiKey: fallbackKey, source: 'env:RESEND_API_KEY' };
  }

  throw new Error(
    'Resend API key not found. ' +
    'Install the Resend integration in Replit, or set the RESEND_API_KEY environment secret. ' +
    `(REPLIT_CONNECTORS_HOSTNAME=${hostname ?? 'unset'}, xReplitToken=${xReplitToken ? 'present' : 'missing'}, RESEND_API_KEY=${fallbackKey ? 'set' : 'unset'})`
  );
}

async function getUncachableResendClient() {
  const { apiKey, source } = await getCredentials();
  console.log(`[emailClient] Instantiating Resend client (key source: ${source})`);
  return new Resend(apiKey);
}

export async function checkEmailCredentials(): Promise<void> {
  try {
    const { source } = await getCredentials();
    console.log(`[emailClient] Startup check: Resend API key available (source: ${source})`);
  } catch (err: any) {
    console.error(`[emailClient] Startup check: Resend API key NOT available — ${err?.message ?? err}`);
    throw err;
  }
}

async function resendSend(resend: Resend, payload: Parameters<Resend['emails']['send']>[0]) {
  const { data, error } = await resend.emails.send(payload);
  if (error) {
    throw new Error(error.message || 'Resend email send failed');
  }
  return data;
}

export async function sendVerificationEmail(email: string, token: string) {
  const resend = await getUncachableResendClient();
  const baseUrl = getBaseUrl();
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`;
  console.log(`[emailClient] Sending verification email to ${email}. Base URL: ${baseUrl}`);

  await resendSend(resend, {
    from: `SEVCO <${FROM_EMAIL}>`,
    to: email,
    subject: "Verify your email — SEVCO",
    html: buildVerificationHtml(verifyUrl),
    text: buildVerificationText(verifyUrl),
  });
  console.log(`[emailClient] Verification email sent successfully to ${email}`);
}

export async function sendTestEmail(toEmail: string) {
  const resend = await getUncachableResendClient();
  const baseUrl = getBaseUrl();
  console.log(`[emailClient] Sending test email to ${toEmail}. Base URL: ${baseUrl}`);

  await resendSend(resend, {
    from: `SEVCO <${FROM_EMAIL}>`,
    to: toEmail,
    subject: "SEVCO — Resend integration test",
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;padding:40px;">
        <tr><td align="center" style="padding-bottom:24px;">
          <span style="font-size:32px;">🪐</span>
          <h2 style="margin:8px 0 0;color:#18181b;font-size:20px;font-weight:600;">SEVCO</h2>
        </td></tr>
        <tr><td style="color:#3f3f46;font-size:15px;line-height:1.6;">
          <p style="margin:0 0 12px;">This is a test email confirming that your Resend integration is working correctly.</p>
          <p style="margin:0;color:#71717a;font-size:13px;">Sent from: ${FROM_EMAIL}<br>Base URL: ${baseUrl}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    text: `SEVCO — Resend integration test\n\nThis is a test email confirming your Resend integration is working.\n\nSent from: ${FROM_EMAIL}\nBase URL: ${baseUrl}`,
  });
  console.log(`[emailClient] Test email sent successfully to ${toEmail}`);
}

function getBaseUrl(): string {
  if (process.env.SITE_URL) {
    const url = process.env.SITE_URL.replace(/\/$/, "");
    console.log(`[emailClient] getBaseUrl() → ${url} (source: SITE_URL)`);
    return url;
  }
  if (process.env.REPLIT_DEPLOYMENT_URL) {
    const url = process.env.REPLIT_DEPLOYMENT_URL;
    console.log(`[emailClient] getBaseUrl() → ${url} (source: REPLIT_DEPLOYMENT_URL)`);
    return url;
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    const url = `https://${process.env.REPLIT_DEV_DOMAIN}`;
    console.log(`[emailClient] getBaseUrl() → ${url} (source: REPLIT_DEV_DOMAIN)`);
    return url;
  }
  console.warn('[emailClient] getBaseUrl() falling back to localhost:5000 — verification links will not work in production');
  return "http://localhost:5000";
}

function buildVerificationHtml(verifyUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;padding:40px;">
        <tr><td align="center" style="padding-bottom:24px;">
          <span style="font-size:32px;">🪐</span>
          <h2 style="margin:8px 0 0;color:#18181b;font-size:20px;font-weight:600;">SEVCO</h2>
        </td></tr>
        <tr><td style="padding-bottom:24px;color:#3f3f46;font-size:15px;line-height:1.6;">
          <p style="margin:0 0 12px;">Welcome to SEVCO! Please verify your email address to complete your registration.</p>
        </td></tr>
        <tr><td align="center" style="padding-bottom:24px;">
          <a href="${verifyUrl}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:15px;font-weight:500;">
            Verify Email Address
          </a>
        </td></tr>
        <tr><td style="color:#71717a;font-size:13px;line-height:1.5;">
          <p style="margin:0 0 8px;">This link expires in 24 hours.</p>
          <p style="margin:0;word-break:break-all;">If the button doesn't work, copy and paste this link: ${verifyUrl}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildVerificationText(verifyUrl: string): string {
  return `SEVCO — Verify Your Email

Welcome to SEVCO! Please verify your email address by visiting the link below:

${verifyUrl}

This link expires in 24 hours.`;
}

export async function setupInboundRoute(): Promise<void> {
  try {
    const baseUrl = getBaseUrl();
    const inboundSecret = process.env.RESEND_INBOUND_SECRET || process.env.RESEND_WEBHOOK_SECRET;
    
    if (!inboundSecret) {
      console.warn("[emailClient] No RESEND_INBOUND_SECRET or RESEND_WEBHOOK_SECRET set — inbound routes cannot receive email body content");
      return;
    }

    const inboundUrl = `${baseUrl}/api/email/inbound?secret=${encodeURIComponent(inboundSecret)}`;
    console.log(`[emailClient] ========================================`);
    console.log(`[emailClient] SETUP: Configure Resend Inbound Route`);
    console.log(`[emailClient] ========================================`);
    console.log(`[emailClient] To receive email body content, configure a Resend Inbound Route:`);
    console.log(`[emailClient] 1. Go to https://resend.com/settings (your Resend dashboard)`);
    console.log(`[emailClient] 2. Click "Inbound" (or "Email Routing")`);
    console.log(`[emailClient] 3. Add a route for domain: sevco.us`);
    console.log(`[emailClient] 4. Set the forward URL to:`);
    console.log(`[emailClient]    ${inboundUrl}`);
    console.log(`[emailClient] 5. Save and test by sending an email to any user@sevco.us address`);
    console.log(`[emailClient] Without this, received emails will show "(empty message)" because the webhook notification does not include body content.`);
    console.log(`[emailClient] ========================================`);
  } catch (err: any) {
    console.error(`[emailClient] Error in setupInboundRoute: ${err?.message ?? err}`);
  }
}

const CONTACT_EMAIL = process.env.CONTACT_EMAIL || "hello@sevco.us";

export async function sendContactEmail(
  name: string,
  email: string,
  subject: string,
  message: string
) {
  const resend = await getUncachableResendClient();

  await resendSend(resend, {
    from: `SEVCO <${FROM_EMAIL}>`,
    to: CONTACT_EMAIL,
    replyTo: email,
    subject: `[Contact] ${subject} — from ${name}`,
    html: buildContactHtml(name, email, subject, message),
    text: buildContactText(name, email, subject, message),
  });
}

function buildContactHtml(name: string, email: string, subject: string, message: string): string {
  const safeMsg = message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;padding:40px;">
        <tr><td style="padding-bottom:24px;border-bottom:1px solid #e4e4e7;">
          <span style="font-size:24px;">🪐</span>
          <span style="font-size:18px;font-weight:600;color:#18181b;margin-left:8px;">SEVCO</span>
          <p style="margin:4px 0 0;color:#71717a;font-size:13px;">New contact form submission</p>
        </td></tr>
        <tr><td style="padding:24px 0 16px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="color:#71717a;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;padding-bottom:4px;">From</td>
              <td style="color:#18181b;font-size:14px;">${name} &lt;${email}&gt;</td>
            </tr>
            <tr><td style="padding:6px 0;" colspan="2"></td></tr>
            <tr>
              <td style="color:#71717a;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;padding-bottom:4px;">Subject</td>
              <td style="color:#18181b;font-size:14px;">${subject}</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="background:#f4f4f5;border-radius:6px;padding:16px;color:#3f3f46;font-size:14px;line-height:1.7;">
          ${safeMsg}
        </td></tr>
        <tr><td style="padding-top:24px;color:#71717a;font-size:12px;">
          Sent via SEVCO contact form. Reply directly to this email to respond to ${name}.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildContactText(name: string, email: string, subject: string, message: string): string {
  return `New SEVCO Contact Form Submission

From: ${name} <${email}>
Subject: ${subject}

Message:
${message}

---
Reply directly to this email to respond to ${name}.`;
}

export async function sendContactReplyEmail(
  toEmail: string,
  toName: string,
  subject: string,
  replyBody: string
) {
  const resend = await getUncachableResendClient();
  const safeBody = replyBody.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");

  await resendSend(resend, {
    from: `SEVCO <${FROM_EMAIL}>`,
    to: toEmail,
    subject: `Re: ${subject} — SEVCO`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;padding:40px;">
        <tr><td style="padding-bottom:24px;border-bottom:1px solid #e4e4e7;">
          <span style="font-size:24px;">🪐</span>
          <span style="font-size:18px;font-weight:600;color:#18181b;margin-left:8px;">SEVCO</span>
          <p style="margin:4px 0 0;color:#71717a;font-size:13px;">Reply to your message</p>
        </td></tr>
        <tr><td style="padding:24px 0 16px;">
          <p style="margin:0;color:#3f3f46;font-size:14px;line-height:1.7;">Hi ${toName},</p>
        </td></tr>
        <tr><td style="background:#f4f4f5;border-radius:6px;padding:16px;color:#3f3f46;font-size:14px;line-height:1.7;">
          ${safeBody}
        </td></tr>
        <tr><td style="padding-top:24px;color:#71717a;font-size:12px;">
          This is a reply to your message sent via the SEVCO contact form.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    text: `Hi ${toName},\n\n${replyBody}\n\n---\nThis is a reply to your message sent via the SEVCO contact form.`,
  });
}

export async function sendInvoiceEmail(invoice: FinanceInvoice) {
  if (!invoice.clientEmail) throw new Error("Invoice has no client email");
  const resend = await getUncachableResendClient();

  const lineItems = (invoice.lineItems as Array<{ description: string; quantity: number; unitPrice: number }>) || [];
  const lineItemsHtml = lineItems.map(item => `
    <tr>
      <td style="padding:8px 0;color:#3f3f46;font-size:14px;">${item.description}</td>
      <td style="padding:8px 0;color:#3f3f46;font-size:14px;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 0;color:#3f3f46;font-size:14px;text-align:right;">$${(item.unitPrice).toFixed(2)}</td>
      <td style="padding:8px 0;color:#3f3f46;font-size:14px;text-align:right;">$${(item.quantity * item.unitPrice).toFixed(2)}</td>
    </tr>
  `).join("");

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;padding:40px;">
        <tr><td style="padding-bottom:24px;border-bottom:1px solid #e4e4e7;">
          <span style="font-size:24px;">🪐</span>
          <span style="font-size:18px;font-weight:600;color:#18181b;margin-left:8px;">SEVCO</span>
          <p style="margin:4px 0 0;color:#71717a;font-size:13px;">Invoice ${invoice.invoiceNumber}</p>
        </td></tr>
        <tr><td style="padding:24px 0 16px;">
          <p style="margin:0 0 8px;color:#18181b;font-size:15px;">Dear <strong>${invoice.clientName}</strong>,</p>
          <p style="margin:0;color:#3f3f46;font-size:14px;">Please find your invoice details below. Payment is due by ${invoice.dueDate || "upon receipt"}.</p>
        </td></tr>
        <tr><td>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e4e4e7;">
            <tr style="background:#f4f4f5;">
              <th style="padding:8px 0;text-align:left;font-size:12px;font-weight:600;color:#71717a;text-transform:uppercase;">Description</th>
              <th style="padding:8px 0;text-align:center;font-size:12px;font-weight:600;color:#71717a;text-transform:uppercase;">Qty</th>
              <th style="padding:8px 0;text-align:right;font-size:12px;font-weight:600;color:#71717a;text-transform:uppercase;">Unit Price</th>
              <th style="padding:8px 0;text-align:right;font-size:12px;font-weight:600;color:#71717a;text-transform:uppercase;">Total</th>
            </tr>
            ${lineItemsHtml}
            <tr style="border-top:2px solid #e4e4e7;">
              <td colspan="3" style="padding:12px 0;font-size:15px;font-weight:600;color:#18181b;">Total Due</td>
              <td style="padding:12px 0;font-size:15px;font-weight:700;color:#18181b;text-align:right;">$${invoice.totalAmount.toFixed(2)}</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding-top:24px;color:#71717a;font-size:12px;">
          This invoice was sent by SEVCO. Please contact us if you have any questions.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await resendSend(resend, {
    from: `SEVCO <${FROM_EMAIL}>`,
    to: invoice.clientEmail,
    subject: `Invoice ${invoice.invoiceNumber} from SEVCO`,
    html,
    text: `Invoice ${invoice.invoiceNumber} from SEVCO\n\nDear ${invoice.clientName},\n\nYour invoice total is $${invoice.totalAmount.toFixed(2)}, due ${invoice.dueDate || "upon receipt"}.\n\nThank you for your business.`,
  });
}
