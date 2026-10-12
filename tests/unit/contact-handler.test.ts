import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleContact, type ContactEnv, type KVLike } from '../../src/server/contact-handler';

const ORIGIN = 'https://northlinedigital.com';
const NOW = 1_800_000_000_000;

const validBody = {
  name: 'Jordan Rivera',
  email: 'jordan@example.com',
  business: 'Rivera Roofing',
  website: 'riveraroofing.com',
  service: 'website-audit',
  message: 'Please review our website. It looks dated and does not work well on phones.',
  budget: '',
  consent: true,
  nl_started_at: String(NOW - 60_000),
};

const configuredEnv: ContactEnv = {
  EMAIL_PROVIDER: 'resend',
  EMAIL_API_KEY: 're_test_key',
  CONTACT_TO_EMAIL: 'owner@example.com',
  CONTACT_FROM_EMAIL: 'Northline Digital <forms@example.com>',
  PUBLIC_SITE_URL: ORIGIN,
};

function jsonRequest(
  body: unknown,
  { ip = '203.0.113.7', origin = ORIGIN, headers = {} as Record<string, string> } = {},
) {
  return new Request(`${ORIGIN}/api/contact`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      'cf-connecting-ip': ip,
      ...(origin ? { origin } : {}),
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function okFetch() {
  return vi.fn(async () => new Response(JSON.stringify({ id: 'email_123' }), { status: 200 }));
}

class MemoryKV {
  store = new Map<string, string>();
  async get(key: string) {
    return this.store.get(key) ?? null;
  }
  async put(key: string, value: string) {
    this.store.set(key, value);
  }
}

let memoryStore: Map<string, { count: number; expires: number }>;

beforeEach(() => {
  memoryStore = new Map();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

const deps = (fetchImpl: typeof fetch) => ({ fetch: fetchImpl, now: () => NOW, memoryStore });

describe('handleContact', () => {
  it('delivers a valid submission through Resend and returns success', async () => {
    const fetchMock = okFetch();
    const res = await handleContact(jsonRequest(validBody), configuredEnv, deps(fetchMock as unknown as typeof fetch));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; referenceId: string };
    expect(body.ok).toBe(true);
    expect(body.referenceId).toMatch(/[0-9a-f-]{36}/);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer re_test_key');
    const payload = JSON.parse(init.body as string);
    expect(payload.to).toEqual(['owner@example.com']);
    expect(payload.reply_to).toBe('jordan@example.com');
    expect(payload.subject).toContain('Rivera Roofing');
    expect(payload.text).toContain('https://riveraroofing.com/');
  });

  it('supports Postmark as the provider', async () => {
    const fetchMock = okFetch();
    const res = await handleContact(
      jsonRequest(validBody),
      { ...configuredEnv, EMAIL_PROVIDER: 'postmark' },
      deps(fetchMock as unknown as typeof fetch),
    );
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.postmarkapp.com/email');
    expect((init.headers as Record<string, string>)['X-Postmark-Server-Token']).toBe('re_test_key');
  });

  it('escapes HTML in the notification email', async () => {
    const fetchMock = okFetch();
    await handleContact(
      jsonRequest({ ...validBody, business: '<script>alert(1)</script> Co' }),
      configuredEnv,
      deps(fetchMock as unknown as typeof fetch),
    );
    const payload = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(payload.html).not.toContain('<script>');
    expect(payload.html).toContain('&lt;script&gt;');
  });

  it('returns field errors with 422 for invalid input', async () => {
    const fetchMock = okFetch();
    const res = await handleContact(
      jsonRequest({ ...validBody, email: 'nope' }),
      configuredEnv,
      deps(fetchMock as unknown as typeof fetch),
    );
    expect(res.status).toBe(422);
    const body = (await res.json()) as { errors: Record<string, string> };
    expect(body.errors.email).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never reports success when email is not configured, and preserves the submission', async () => {
    const kv = new MemoryKV();
    const res = await handleContact(
      jsonRequest(validBody),
      { PUBLIC_SITE_URL: ORIGIN, CONTACT_KV: kv as KVLike },
      deps(okFetch() as unknown as typeof fetch),
    );
    expect(res.status).toBe(503);
    const body = (await res.json()) as { ok: boolean; code: string };
    expect(body.ok).toBe(false);
    expect(body.code).toBe('not_configured');
    expect([...kv.store.keys()].some((k) => k.startsWith('undelivered:'))).toBe(true);
  });

  it('returns 502 and preserves the submission when the provider fails', async () => {
    const kv = new MemoryKV();
    const failing = vi.fn(async () => new Response('{"message":"invalid from"}', { status: 422 }));
    const res = await handleContact(
      jsonRequest(validBody),
      { ...configuredEnv, CONTACT_KV: kv as KVLike },
      deps(failing as unknown as typeof fetch),
    );
    expect(res.status).toBe(502);
    expect(((await res.json()) as { code: string }).code).toBe('delivery_failed');
    const saved = [...kv.store.entries()].find(([k]) => k.startsWith('undelivered:'));
    expect(saved && JSON.parse(saved[1]).email).toBe('jordan@example.com');
  });

  it('returns 502 on provider network errors', async () => {
    const throwing = vi.fn(async () => {
      throw new Error('connection reset');
    });
    const res = await handleContact(jsonRequest(validBody), configuredEnv, deps(throwing as unknown as typeof fetch));
    expect(res.status).toBe(502);
  });

  it('silently accepts but does not deliver honeypot submissions', async () => {
    const fetchMock = okFetch();
    const res = await handleContact(
      jsonRequest({ ...validBody, nl_reference_code: 'http://spam.example' }),
      configuredEnv,
      deps(fetchMock as unknown as typeof fetch),
    );
    expect(res.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects submissions completed implausibly fast', async () => {
    const res = await handleContact(
      jsonRequest({ ...validBody, nl_started_at: String(NOW - 500) }),
      configuredEnv,
      deps(okFetch() as unknown as typeof fetch),
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('too_fast');
  });

  it('rejects cross-origin posts', async () => {
    const res = await handleContact(
      jsonRequest(validBody, { origin: 'https://evil.example' }),
      configuredEnv,
      deps(okFetch() as unknown as typeof fetch),
    );
    expect(res.status).toBe(403);
  });

  it('rate limits repeated submissions from one IP (memory fallback)', async () => {
    const env = { ...configuredEnv, RATE_LIMIT_MAX: '2' };
    const f = okFetch() as unknown as typeof fetch;
    expect((await handleContact(jsonRequest(validBody), env, deps(f))).status).toBe(200);
    expect((await handleContact(jsonRequest(validBody), env, deps(f))).status).toBe(200);
    const limited = await handleContact(jsonRequest(validBody), env, deps(f));
    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toBeTruthy();
    // A different IP is unaffected.
    expect((await handleContact(jsonRequest(validBody, { ip: '198.51.100.2' }), env, deps(f))).status).toBe(200);
  });

  it('rate limits using KV when bound', async () => {
    const kv = new MemoryKV();
    const env = { ...configuredEnv, RATE_LIMIT_MAX: '1', CONTACT_KV: kv as KVLike };
    const f = okFetch() as unknown as typeof fetch;
    expect((await handleContact(jsonRequest(validBody), env, deps(f))).status).toBe(200);
    expect((await handleContact(jsonRequest(validBody), env, deps(f))).status).toBe(429);
    expect([...kv.store.keys()].some((k) => k.startsWith('rl:'))).toBe(true);
    expect([...kv.store.keys()].join()).not.toContain('203.0.113.7');
  });

  it('verifies Turnstile when a secret is configured', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.includes('turnstile')
        ? new Response(JSON.stringify({ success: false }), { status: 200 })
        : new Response('{}', { status: 200 }),
    );
    const env = { ...configuredEnv, TURNSTILE_SECRET_KEY: 'secret' };
    const res = await handleContact(
      jsonRequest({ ...validBody, 'cf-turnstile-response': 'token' }),
      env,
      deps(fetchMock as unknown as typeof fetch),
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('captcha_failed');

    const passing = vi.fn(
      async (url: string) =>
        new Response(JSON.stringify(url.includes('turnstile') ? { success: true } : { id: 'x' }), { status: 200 }),
    );
    const ok = await handleContact(
      jsonRequest({ ...validBody, 'cf-turnstile-response': 'token' }),
      env,
      deps(passing as unknown as typeof fetch),
    );
    expect(ok.status).toBe(200);
  });

  it('supports no-JavaScript form posts with a redirect on success', async () => {
    const form = new URLSearchParams({ ...validBody, consent: 'yes' } as unknown as Record<string, string>);
    const req = new Request(`${ORIGIN}/api/contact`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', origin: ORIGIN, 'cf-connecting-ip': '192.0.2.1' },
      body: form,
    });
    const res = await handleContact(req, configuredEnv, deps(okFetch() as unknown as typeof fetch));
    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe('/contact/thank-you');
  });

  it('renders an HTML error page for no-JavaScript posts that fail validation', async () => {
    const req = new Request(`${ORIGIN}/api/contact`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', origin: ORIGIN },
      body: new URLSearchParams({ name: 'x' }),
    });
    const res = await handleContact(req, configuredEnv, deps(okFetch() as unknown as typeof fetch));
    expect(res.status).toBe(422);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(await res.text()).toContain('was not sent');
  });

  it('rejects malformed JSON and non-POST methods', async () => {
    const bad = new Request(`${ORIGIN}/api/contact`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: '{not json',
    });
    expect((await handleContact(bad, configuredEnv, deps(okFetch() as unknown as typeof fetch))).status).toBe(400);
    const get = new Request(`${ORIGIN}/api/contact`, { method: 'GET' });
    expect((await handleContact(get, configuredEnv)).status).toBe(405);
  });
});
