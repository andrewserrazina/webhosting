/**
 * Transactional email delivery. The provider is chosen at runtime with the
 * EMAIL_PROVIDER variable so it can be swapped without code changes.
 */
import { budgetLabel, serviceLabel, type ContactSubmission } from '../lib/contact';

export type EmailProvider = 'resend' | 'postmark';

export interface EmailConfig {
  provider: EmailProvider;
  apiKey: string;
  to: string;
  from: string;
}

export interface OutgoingEmail {
  subject: string;
  text: string;
  html: string;
  replyTo: string;
}

export class EmailDeliveryError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'EmailDeliveryError';
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildInquiryEmail(
  data: ContactSubmission,
  meta: { receivedAt: string; referenceId: string },
): OutgoingEmail {
  const rows: [string, string][] = [
    ['Name', data.name],
    ['Email', data.email],
    ['Business', data.business],
    ['Website', data.website || 'Not provided'],
    ['Service', serviceLabel(data.service)],
    ['Budget', data.budget ? budgetLabel(data.budget) : 'Not provided'],
    ['Received', meta.receivedAt],
    ['Reference', meta.referenceId],
  ];

  const subject = `New inquiry: ${serviceLabel(data.service)} — ${data.business}`.slice(0, 200);

  const text = [
    'New inquiry from the Northline Digital website',
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    'Project description:',
    data.message,
    '',
    'Reply to this email to respond directly to the sender.',
  ].join('\n');

  const html = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#0B1F3A;line-height:1.5">
<h2 style="margin:0 0 16px">New website inquiry</h2>
<table cellpadding="6" cellspacing="0" style="border-collapse:collapse">
${rows
  .map(
    ([k, v]) =>
      `<tr><th align="left" style="color:#64748B;font-weight:600;padding-right:16px;vertical-align:top">${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`,
  )
  .join('\n')}
</table>
<h3 style="margin:24px 0 8px">Project description</h3>
<p style="white-space:pre-wrap;margin:0">${escapeHtml(data.message)}</p>
<p style="color:#64748B;font-size:13px;margin-top:24px">Reply to this email to respond directly to ${escapeHtml(data.name)}.</p>
</body></html>`;

  return { subject, text, html, replyTo: data.email };
}

export async function sendEmail(
  config: EmailConfig,
  email: OutgoingEmail,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  let response: Response;
  try {
    if (config.provider === 'resend') {
      response = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: config.from,
          to: config.to
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          reply_to: email.replyTo,
          subject: email.subject,
          text: email.text,
          html: email.html,
        }),
      });
    } else {
      response = await fetchImpl('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
          'X-Postmark-Server-Token': config.apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          From: config.from,
          To: config.to,
          ReplyTo: email.replyTo,
          Subject: email.subject,
          TextBody: email.text,
          HtmlBody: email.html,
          MessageStream: 'outbound',
        }),
      });
    }
  } catch (err) {
    throw new EmailDeliveryError(`Network error contacting ${config.provider}: ${(err as Error).message}`);
  }

  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).slice(0, 500);
    throw new EmailDeliveryError(`${config.provider} responded ${response.status}: ${detail}`, response.status);
  }
}
