/**
 * Contact form request handler for the Cloudflare Pages Function at
 * /api/contact. Kept separate from the Pages entry point so it can be unit
 * tested with a plain Request and a mock environment.
 *
 * Guarantees:
 *  - Input is validated with the same rules as the browser.
 *  - Spam protection: honeypot, minimum fill time, optional Turnstile.
 *  - Per-IP rate limiting (KV-backed when CONTACT_KV is bound).
 *  - A submission is never reported as sent unless the email provider accepted
 *    it. When delivery fails, the visitor sees an error and the submission is
 *    preserved in KV (if bound) and in the function logs for recovery.
 */
import { HONEYPOT_FIELD, MIN_FILL_TIME_MS, STARTED_AT_FIELD, validateContact, type ContactField } from '../lib/contact';
import { buildInquiryEmail, sendEmail, type EmailConfig, type EmailProvider } from './email';

/** Subset of the Workers KV API used here (keeps this module runtime-agnostic). */
export interface KVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface ContactEnv {
  EMAIL_PROVIDER?: string;
  EMAIL_API_KEY?: string;
  CONTACT_TO_EMAIL?: string;
  CONTACT_FROM_EMAIL?: string;
  TURNSTILE_SECRET_KEY?: string;
  ALLOWED_ORIGINS?: string;
  PUBLIC_SITE_URL?: string;
  RATE_LIMIT_MAX?: string;
  RATE_LIMIT_WINDOW_SECONDS?: string;
  CONTACT_KV?: KVLike;
}

export interface HandlerDeps {
  fetch?: typeof fetch;
  now?: () => number;
  /** In-memory fallback store for rate limiting when KV is not bound. */
  memoryStore?: Map<string, { count: number; expires: number }>;
}

type ErrorCode =
  | 'invalid_request'
  | 'forbidden_origin'
  | 'validation_failed'
  | 'too_fast'
  | 'captcha_failed'
  | 'rate_limited'
  | 'not_configured'
  | 'delivery_failed';

interface JsonBody {
  ok: boolean;
  code?: ErrorCode;
  message: string;
  errors?: Partial<Record<ContactField, string>>;
  referenceId?: string;
}

const MESSAGES: Record<ErrorCode, string> = {
  invalid_request: 'We could not read that submission. Please refresh the page and try again.',
  forbidden_origin: 'This form can only be submitted from our website.',
  validation_failed: 'Please correct the highlighted fields and try again.',
  too_fast: 'That was quicker than we expected. Please wait a moment, review your details, and submit again.',
  captcha_failed: 'We could not verify the spam check. Please complete it and submit again.',
  rate_limited: 'We have received several submissions from your connection. Please wait a few minutes and try again.',
  not_configured:
    'Our form is temporarily unable to send messages. Your details were not delivered — please try again later or email us directly.',
  delivery_failed:
    'Something went wrong sending your request, so it has not been delivered. Please try again in a few minutes or email us directly.',
};

const STATUS: Record<ErrorCode, number> = {
  invalid_request: 400,
  forbidden_origin: 403,
  validation_failed: 422,
  too_fast: 400,
  captcha_failed: 400,
  rate_limited: 429,
  not_configured: 503,
  delivery_failed: 502,
};

const defaultMemoryStore = new Map<string, { count: number; expires: number }>();

function wantsJson(request: Request): boolean {
  const accept = request.headers.get('accept') ?? '';
  const type = request.headers.get('content-type') ?? '';
  return accept.includes('application/json') || type.includes('application/json');
}

function escapeHtml(v: string): string {
  return v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

const SECURITY_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

function respond(
  request: Request,
  status: number,
  body: JsonBody,
  extraHeaders: Record<string, string> = {},
): Response {
  if (wantsJson(request)) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...SECURITY_HEADERS, ...extraHeaders },
    });
  }
  // No-JavaScript fallback: redirect on success, render a minimal page on error.
  if (body.ok) {
    return new Response(null, { status: 303, headers: { Location: '/contact/thank-you', ...SECURITY_HEADERS } });
  }
  const list = body.errors
    ? `<ul>${Object.values(body.errors)
        .map((e) => `<li>${escapeHtml(e ?? '')}</li>`)
        .join('')}</ul>`
    : '';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Submission not sent — Northline Digital</title>
<style>body{font-family:system-ui,sans-serif;background:#FAFAF7;color:#0B1F3A;max-width:40rem;margin:4rem auto;padding:0 1rem;line-height:1.6}a{color:#0B1F3A;font-weight:600}</style></head>
<body><h1>Your request was not sent</h1><p>${escapeHtml(body.message)}</p>${list}<p><a href="/contact">Return to the contact form</a></p></body></html>`;
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', ...SECURITY_HEADERS, ...extraHeaders },
  });
}

function fail(request: Request, code: ErrorCode, extra: Partial<JsonBody> = {}, headers?: Record<string, string>) {
  return respond(request, STATUS[code], { ok: false, code, message: MESSAGES[code], ...extra }, headers);
}

async function parseBody(request: Request): Promise<Record<string, unknown> | null> {
  const type = request.headers.get('content-type') ?? '';
  try {
    if (type.includes('application/json')) {
      const json = await request.json();
      return json && typeof json === 'object' && !Array.isArray(json) ? (json as Record<string, unknown>) : null;
    }
    if (type.includes('application/x-www-form-urlencoded') || type.includes('multipart/form-data')) {
      const form = await request.formData();
      const out: Record<string, unknown> = {};
      for (const [k, v] of form.entries()) if (typeof v === 'string') out[k] = v;
      return out;
    }
  } catch {
    return null;
  }
  return null;
}

function allowedOrigins(env: ContactEnv, request: Request): string[] {
  const configured = (env.ALLOWED_ORIGINS || env.PUBLIC_SITE_URL || '')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  // Always allow the origin the function is served from (covers *.pages.dev previews).
  configured.push(new URL(request.url).origin);
  return configured;
}

async function hashIp(ip: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`northline:${ip}`));
  return [...new Uint8Array(digest)]
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function checkRateLimit(
  env: ContactEnv,
  ip: string,
  now: number,
  memory: Map<string, { count: number; expires: number }>,
): Promise<{ limited: boolean; retryAfter: number }> {
  const max = Math.max(1, Number(env.RATE_LIMIT_MAX) || 5);
  const windowSec = Math.max(60, Number(env.RATE_LIMIT_WINDOW_SECONDS) || 600);
  const windowStart = Math.floor(now / 1000 / windowSec) * windowSec;
  const retryAfter = windowStart + windowSec - Math.floor(now / 1000);
  const key = `rl:${await hashIp(ip)}:${windowStart}`;

  if (env.CONTACT_KV) {
    try {
      const current = Number(await env.CONTACT_KV.get(key)) || 0;
      if (current >= max) return { limited: true, retryAfter };
      await env.CONTACT_KV.put(key, String(current + 1), { expirationTtl: Math.max(60, windowSec * 2) });
      return { limited: false, retryAfter };
    } catch (err) {
      console.error('[contact] KV rate limit unavailable, using memory fallback', err);
    }
  }

  for (const [k, v] of memory) if (v.expires <= now) memory.delete(k);
  const entry = memory.get(key) ?? { count: 0, expires: (windowStart + windowSec) * 1000 };
  if (entry.count >= max) return { limited: true, retryAfter };
  entry.count += 1;
  memory.set(key, entry);
  return { limited: false, retryAfter };
}

async function verifyTurnstile(secret: string, token: string, ip: string, fetchImpl: typeof fetch): Promise<boolean> {
  if (!token) return false;
  try {
    const body = new FormData();
    body.append('secret', secret);
    body.append('response', token);
    if (ip) body.append('remoteip', ip);
    const res = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error('[contact] Turnstile verification error', err);
    return false;
  }
}

function resolveEmailConfig(env: ContactEnv): EmailConfig | null {
  const provider = (env.EMAIL_PROVIDER || 'resend').toLowerCase() as EmailProvider;
  if (provider !== 'resend' && provider !== 'postmark') return null;
  if (!env.EMAIL_API_KEY || !env.CONTACT_TO_EMAIL || !env.CONTACT_FROM_EMAIL) return null;
  return { provider, apiKey: env.EMAIL_API_KEY, to: env.CONTACT_TO_EMAIL, from: env.CONTACT_FROM_EMAIL };
}

async function preserveSubmission(env: ContactEnv, referenceId: string, record: unknown): Promise<void> {
  // Function logs are the last-resort record (visible in Cloudflare → Workers Logs).
  console.error('[contact] UNDELIVERED SUBMISSION', JSON.stringify({ referenceId, record }));
  if (!env.CONTACT_KV) return;
  try {
    await env.CONTACT_KV.put(`undelivered:${referenceId}`, JSON.stringify(record), {
      expirationTtl: 60 * 60 * 24 * 30,
    });
  } catch (err) {
    console.error('[contact] Failed to store undelivered submission in KV', err);
  }
}

export async function handleContact(request: Request, env: ContactEnv, deps: HandlerDeps = {}): Promise<Response> {
  const fetchImpl = deps.fetch ?? fetch;
  const now = deps.now?.() ?? Date.now();
  const memory = deps.memoryStore ?? defaultMemoryStore;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST', ...SECURITY_HEADERS } });
  }

  const origin = request.headers.get('origin');
  if (origin && !allowedOrigins(env, request).includes(origin.replace(/\/+$/, ''))) {
    return fail(request, 'forbidden_origin');
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 64 * 1024) return fail(request, 'invalid_request');

  const body = await parseBody(request);
  if (!body) return fail(request, 'invalid_request');

  // Honeypot: bots fill every field. Acknowledge without delivering.
  const honeypot = body[HONEYPOT_FIELD];
  if (typeof honeypot === 'string' && honeypot.trim() !== '') {
    console.warn('[contact] Honeypot triggered; submission dropped as spam');
    return respond(request, 200, { ok: true, message: 'Thanks — your request has been received.' });
  }

  const startedAt = Number(body[STARTED_AT_FIELD]);
  if (Number.isFinite(startedAt) && startedAt > 0 && now - startedAt < MIN_FILL_TIME_MS) {
    return fail(request, 'too_fast');
  }

  const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';

  const rate = await checkRateLimit(env, ip, now, memory);
  if (rate.limited) return fail(request, 'rate_limited', {}, { 'Retry-After': String(rate.retryAfter) });

  const result = validateContact(body);
  if (!result.ok) return fail(request, 'validation_failed', { errors: result.errors });

  if (env.TURNSTILE_SECRET_KEY) {
    const token = typeof body['cf-turnstile-response'] === 'string' ? (body['cf-turnstile-response'] as string) : '';
    if (!(await verifyTurnstile(env.TURNSTILE_SECRET_KEY, token, ip, fetchImpl)))
      return fail(request, 'captcha_failed');
  }

  const referenceId = crypto.randomUUID();
  const receivedAt = new Date(now).toISOString();
  const record = { ...result.data, receivedAt, referenceId };

  const config = resolveEmailConfig(env);
  if (!config) {
    console.error(
      '[contact] Email delivery is not configured. Set EMAIL_PROVIDER, EMAIL_API_KEY, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL.',
    );
    await preserveSubmission(env, referenceId, record);
    return fail(request, 'not_configured', { referenceId });
  }

  try {
    await sendEmail(config, buildInquiryEmail(result.data, { receivedAt, referenceId }), fetchImpl);
  } catch (err) {
    console.error('[contact] Delivery failed', err);
    await preserveSubmission(env, referenceId, record);
    return fail(request, 'delivery_failed', { referenceId });
  }

  return respond(request, 200, {
    ok: true,
    message: 'Thanks — your request has been received.',
    referenceId,
  });
}
