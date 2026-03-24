// Resend integration - uses Replit connector for credentials
import { Resend } from 'resend';

const FROM_EMAIL = "noreply@sevco.us";

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X-Replit-Token not found for repl/depl');
  }

  const connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X-Replit-Token': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || !connectionSettings.settings.api_key) {
    throw new Error('Resend not connected');
  }
  return { apiKey: connectionSettings.settings.api_key };
}

async function getUncachableResendClient() {
  const { apiKey } = await getCredentials();
  return new Resend(apiKey);
}

export async function sendVerificationEmail(email: string, token: string) {
  const resend = await getUncachableResendClient();
  const verifyUrl = `${getBaseUrl()}/verify-email?token=${token}`;

  await resend.emails.send({
    from: `SEVCO <${FROM_EMAIL}>`,
    to: email,
    subject: "Verify your email — SEVCO",
    html: buildVerificationHtml(verifyUrl),
    text: buildVerificationText(verifyUrl),
  });
}

function getBaseUrl(): string {
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  if (process.env.REPLIT_DEPLOYMENT_URL) {
    return process.env.REPLIT_DEPLOYMENT_URL;
  }
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
