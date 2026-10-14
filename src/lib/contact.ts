/**
 * Contact form schema and validation.
 *
 * Shared by the browser (instant feedback) and the Cloudflare Pages Function
 * (authoritative check), so both sides always apply identical rules.
 */

export const SERVICE_OPTIONS = [
  { value: 'website-audit', label: 'Free website audit' },
  { value: 'website-refresh', label: '$199 one-page website refresh' },
  { value: 'website-overhaul', label: 'Website overhaul' },
  { value: 'new-website', label: 'New website development' },
  { value: 'digital-solutions', label: 'Business digital solutions' },
  { value: 'website-care', label: 'Ongoing website care' },
  { value: 'not-sure', label: 'Not sure yet' },
] as const;

export const BUDGET_OPTIONS = [
  { value: 'under-1500', label: 'Under $1,500' },
  { value: '1500-3000', label: '$1,500 – $3,000' },
  { value: '3000-6000', label: '$3,000 – $6,000' },
  { value: '6000-plus', label: '$6,000+' },
  { value: 'unsure', label: 'Not sure yet' },
] as const;

export type ServiceValue = (typeof SERVICE_OPTIONS)[number]['value'];
export type BudgetValue = (typeof BUDGET_OPTIONS)[number]['value'];

export const LIMITS = {
  name: { min: 2, max: 100 },
  email: { max: 254 },
  business: { min: 2, max: 120 },
  website: { max: 300 },
  message: { min: 20, max: 5000 },
} as const;

/** Name of the hidden honeypot field. Real visitors never fill it in. */
export const HONEYPOT_FIELD = 'nl_reference_code';
/** Hidden field holding the epoch-ms time the form was rendered. */
export const STARTED_AT_FIELD = 'nl_started_at';
/** Submissions faster than this are treated as automated. */
export const MIN_FILL_TIME_MS = 3000;

export type ContactField = 'name' | 'email' | 'business' | 'website' | 'service' | 'message' | 'budget' | 'consent';

export interface ContactSubmission {
  name: string;
  email: string;
  business: string;
  website: string;
  service: ServiceValue;
  message: string;
  budget: BudgetValue | '';
  consent: true;
}

export type ValidationResult =
  { ok: true; data: ContactSubmission } | { ok: false; errors: Partial<Record<ContactField, string>> };

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

// Strip ASCII control characters (keep \n and \t for the message body).
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function clean(value: unknown, { multiline = false } = {}): string {
  if (typeof value !== 'string') return '';
  let out = value.replace(CONTROL_CHARS, '').replace(/\r\n?/g, '\n');
  if (!multiline) out = out.replace(/\s+/g, ' ');
  return out.trim();
}

function isTruthy(value: unknown): boolean {
  return value === true || value === 'true' || value === 'on' || value === 'yes' || value === '1';
}

/** Adds https:// when a scheme is missing and returns a normalized URL, or null if invalid. */
export function normalizeWebsite(raw: string): string | null {
  if (!raw) return '';
  const candidate = /^[a-z][a-z\d+\-.]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname.includes('.') || url.hostname.endsWith('.')) return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function validateContact(input: Record<string, unknown>): ValidationResult {
  const errors: Partial<Record<ContactField, string>> = {};

  const name = clean(input.name);
  const email = clean(input.email).toLowerCase();
  const business = clean(input.business);
  const websiteRaw = clean(input.website);
  const service = clean(input.service);
  const message = clean(input.message, { multiline: true });
  const budget = clean(input.budget);
  const consent = isTruthy(input.consent);

  if (!name) errors.name = 'Please enter your name.';
  else if (name.length < LIMITS.name.min) errors.name = 'Please enter your full name.';
  else if (name.length > LIMITS.name.max) errors.name = `Please keep your name under ${LIMITS.name.max} characters.`;

  if (!email) errors.email = 'Please enter your email address.';
  else if (email.length > LIMITS.email.max || !EMAIL_RE.test(email))
    errors.email = 'Please enter a valid email address, like you@company.com.';

  if (!business) errors.business = 'Please enter your business name.';
  else if (business.length < LIMITS.business.min) errors.business = 'Please enter your full business name.';
  else if (business.length > LIMITS.business.max)
    errors.business = `Please keep the business name under ${LIMITS.business.max} characters.`;

  let website = '';
  if (websiteRaw) {
    const normalized = websiteRaw.length > LIMITS.website.max ? null : normalizeWebsite(websiteRaw);
    if (normalized === null) errors.website = 'Please enter a valid website address, like yourbusiness.com.';
    else website = normalized;
  }

  if (!service) errors.service = 'Please choose the service you need.';
  else if (!SERVICE_OPTIONS.some((o) => o.value === service))
    errors.service = 'Please choose one of the listed services.';

  if (!message) errors.message = 'Please tell us a little about your project.';
  else if (message.length < LIMITS.message.min)
    errors.message = `Please add a bit more detail (at least ${LIMITS.message.min} characters).`;
  else if (message.length > LIMITS.message.max)
    errors.message = `Please keep your description under ${LIMITS.message.max} characters.`;

  if (budget && !BUDGET_OPTIONS.some((o) => o.value === budget))
    errors.budget = 'Please choose one of the listed ranges.';

  if (!consent) errors.consent = 'Please confirm we may use these details to respond to your inquiry.';

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      name,
      email,
      business,
      website,
      service: service as ServiceValue,
      message,
      budget: budget as BudgetValue | '',
      consent: true,
    },
  };
}

export function serviceLabel(value: string): string {
  return SERVICE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function budgetLabel(value: string): string {
  return BUDGET_OPTIONS.find((o) => o.value === value)?.label ?? 'Not provided';
}
