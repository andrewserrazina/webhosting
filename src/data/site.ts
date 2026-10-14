/** Global site configuration. Public values come from build-time env vars. */

const rawSiteUrl = import.meta.env.PUBLIC_SITE_URL || 'https://example.com';

export const site = {
  name: 'Valebrook Studio',
  tagline: 'Better Websites. Stronger Businesses.',
  description:
    'Valebrook Studio designs and develops modern websites and digital solutions that help small and growing businesses build credibility and turn more visitors into opportunities.',
  url: rawSiteUrl.replace(/\/+$/, ''),
  /** Public contact email. Empty string hides it everywhere on the site. */
  contactEmail: (import.meta.env.PUBLIC_CONTACT_EMAIL || '').trim(),
  turnstileSiteKey: (import.meta.env.PUBLIC_TURNSTILE_SITE_KEY || '').trim(),
  locale: 'en_US',
} as const;

export const mainNav = [
  { href: '/services', label: 'Services' },
  { href: '/work', label: 'Work' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
] as const;

export const primaryCta = { href: '/contact', label: 'Get a Free Website Audit' } as const;
