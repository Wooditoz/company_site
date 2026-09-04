// Cloud Function: receives moadigital.co contact-form submissions and forwards
// them to support@moadigital.co via Resend.
//
// Hosted at `/api/contact` (rewrite in firebase.json), so the browser POSTs
// same-origin and no CORS handling is needed in the frontend.

const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { logger } = require('firebase-functions');

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
const RECAPTCHA_SECRET_KEY = defineSecret('RECAPTCHA_SECRET_KEY');

const FROM = 'MOA Digital <contact@moadigital.co>';
const TO = ['support@moadigital.co'];

const MAX = { name: 200, email: 200, company: 200, message: 5000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildHtml({ name, email, company, message, locale }) {
  const row = (label, value) =>
    `<tr><td style="padding:8px 0;color:#6b7280;width:120px;">${label}</td><td style="padding:8px 0;font-weight:600;color:#111827;">${value}</td></tr>`;

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <tr><td style="background:#0F172A;padding:24px 40px;">
          <p style="margin:0;color:#ffffff;font-size:18px;font-weight:bold;">New contact form submission</p>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            ${row('Name', escapeHtml(name))}
            ${row('Email', `<a href="mailto:${escapeHtml(email)}" style="color:#2563eb;">${escapeHtml(email)}</a>`)}
            ${row('Company', escapeHtml(company || '—'))}
            ${row('Locale', escapeHtml(locale || '—'))}
          </table>
          <div style="margin-top:24px;padding-top:24px;border-top:1px solid #e5e7eb;">
            <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">Message</p>
            <div style="white-space:pre-wrap;color:#111827;font-size:14px;line-height:1.6;">${escapeHtml(message)}</div>
          </div>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px 40px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
            Sent via moadigital.co contact form
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

exports.sendContactEmail = onRequest(
  {
    region: 'asia-southeast1',
    secrets: [RESEND_API_KEY, RECAPTCHA_SECRET_KEY],
    maxInstances: 10,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = typeof req.body === 'object' && req.body !== null ? req.body : {};

    // Honeypot — silently accept bot submissions so they don't retry
    if (body._hp) {
      logger.info('Honeypot triggered');
      return res.status(200).json({ ok: true });
    }

    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim();
    const company = String(body.company || '').trim();
    const message = String(body.message || '').trim();
    const locale = String(body.locale || 'en').trim();
    const captchaToken = String(body.captchaToken || '').trim();

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (
      name.length > MAX.name ||
      email.length > MAX.email ||
      company.length > MAX.company ||
      message.length > MAX.message
    ) {
      return res.status(400).json({ error: 'Input too long' });
    }

    // reCAPTCHA verification
    if (!captchaToken) {
      return res.status(400).json({ error: 'Captcha required' });
    }
    try {
      const verifyResp = await fetch(
        'https://www.google.com/recaptcha/api/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `secret=${encodeURIComponent(RECAPTCHA_SECRET_KEY.value())}&response=${encodeURIComponent(captchaToken)}`,
        }
      );
      const verifyData = await verifyResp.json();
      if (!verifyData.success) {
        logger.warn('Captcha verification failed', { errors: verifyData['error-codes'] });
        return res.status(400).json({ error: 'Captcha verification failed' });
      }
    } catch (e) {
      logger.error('Captcha verify exception', { error: e?.message });
      return res.status(500).json({ error: 'Captcha service error' });
    }

    const subject = `Contact form — ${name}${company ? ` (${company})` : ''}`;
    const html = buildHtml({ name, email, company, message, locale });

    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY.value()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM,
          to: TO,
          reply_to: email,
          subject,
          html,
        }),
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        logger.error('Resend API error', { status: resp.status, body: text.slice(0, 400) });
        return res.status(502).json({ error: 'Email service error' });
      }

      logger.info('Contact email sent', { from: email, company });
      return res.status(200).json({ ok: true });
    } catch (e) {
      logger.error('Send email failed', { error: e?.message });
      return res.status(500).json({ error: 'Internal error' });
    }
  }
);
