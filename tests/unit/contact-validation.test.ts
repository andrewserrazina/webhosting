import { describe, expect, it } from 'vitest';
import { normalizeWebsite, validateContact } from '../../src/lib/contact';

const valid = {
  name: 'Jordan Rivera',
  email: 'Jordan@Example.com',
  business: 'Rivera Roofing',
  website: 'riveraroofing.com',
  service: 'website-overhaul',
  message: 'Our website is old and hard to use on phones. We want more quote requests.',
  budget: '1500-3000',
  consent: 'yes',
};

describe('validateContact', () => {
  it('accepts a complete, valid submission and normalizes values', () => {
    const result = validateContact(valid);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.email).toBe('jordan@example.com');
    expect(result.data.website).toBe('https://riveraroofing.com/');
    expect(result.data.consent).toBe(true);
  });

  it('allows optional website and budget to be empty', () => {
    const result = validateContact({ ...valid, website: '', budget: '' });
    expect(result.ok).toBe(true);
  });

  it('reports every missing required field', () => {
    const result = validateContact({});
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(['business', 'consent', 'email', 'message', 'name', 'service']);
  });

  it.each([
    ['email', 'not-an-email'],
    ['email', 'a@b'],
    ['website', 'javascript:alert(1)'],
    ['website', 'not a url'],
    ['service', 'hacking'],
    ['budget', 'a-million'],
    ['message', 'too short'],
    ['name', 'J'],
  ])('rejects invalid %s: %s', (field, value) => {
    const result = validateContact({ ...valid, [field]: value });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toHaveProperty(field);
  });

  it('rejects overly long input', () => {
    const result = validateContact({ ...valid, message: 'x'.repeat(5001), name: 'n'.repeat(101) });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.message).toBeDefined();
    expect(result.errors.name).toBeDefined();
  });

  it('requires explicit consent', () => {
    for (const consent of [undefined, '', 'no', false]) {
      const result = validateContact({ ...valid, consent });
      expect(result.ok).toBe(false);
    }
    expect(validateContact({ ...valid, consent: true }).ok).toBe(true);
  });

  it('strips control characters and collapses whitespace in single-line fields', () => {
    const result = validateContact({ ...valid, name: '  Jordan\u0000   Rivera\n ' });
    expect(result.ok && result.data.name).toBe('Jordan Rivera');
  });

  it('ignores non-string values safely', () => {
    const result = validateContact({ ...valid, name: { $gt: '' } as unknown as string });
    expect(result.ok).toBe(false);
  });
});

describe('normalizeWebsite', () => {
  it('adds https:// when missing', () => {
    expect(normalizeWebsite('example.com/path')).toBe('https://example.com/path');
  });
  it('keeps http and https URLs', () => {
    expect(normalizeWebsite('http://example.com')).toBe('http://example.com/');
  });
  it('rejects other schemes, credentials and bare hosts', () => {
    expect(normalizeWebsite('ftp://example.com')).toBeNull();
    expect(normalizeWebsite('https://user:pass@example.com')).toBeNull();
    expect(normalizeWebsite('localhost')).toBeNull();
  });
});
