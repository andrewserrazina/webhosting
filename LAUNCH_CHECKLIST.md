# Launch-readiness checklist

Status as of 2026-10-12. ✅ = done and verified in this repository · ⬜ = needs credentials, external verification, or owner approval.

## 1. Built and verified

- ✅ All routes are built: `/`, `/services`, `/work`, three case studies, `/about`, `/contact`, `/privacy`, plus `/contact/thank-you` (noindex) and a 404 page
- ✅ Original SVG brand: logo mark, outlined wordmark, reversed version, favicons, touch icons, OG image
- ✅ Responsive layouts inspected at 1440 px desktop and 390 px mobile; automated check that no page scrolls horizontally on mobile
- ✅ Contact form: client and server validation, honeypot, minimum fill time, per-IP rate limiting, optional Turnstile, origin check, no-JS fallback, success and error states
- ✅ Email delivery for Resend and Postmark (unit tested with mocked provider responses)
- ✅ Failed or unconfigured delivery never shows success. The visitor sees an error, and the submission is logged (and stored in KV when bound)
- ✅ SEO: unique titles and descriptions, canonical URLs, Open Graph/Twitter tags, sitemap, robots.txt, structured data (Organization, WebSite, BreadcrumbList, FAQPage), alt text on every image, a single H1 per page
- ✅ Security headers and CSP (`public/_headers`); long-term caching for hashed assets
- ✅ Cloudflare Pages config (`wrangler.toml`, `.node-version`); the Function was verified running in local `wrangler pages dev` (workerd)
- ✅ CI workflow (`.github/workflows/ci.yml`)

## 2. Needs credentials or setup (owner)

- ⬜ **Create the Cloudflare Pages project** and connect this repository (README → Deploying)
- ⬜ **Choose and confirm the production domain** and set `PUBLIC_SITE_URL`. The placeholder `https://example.com` is used until you set it. Domain ownership has not been verified.
- ⬜ **Email provider account** (Resend or Postmark): verify the sending domain (SPF/DKIM) and set `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`
- ⬜ **End-to-end form test on the deployed site.** The form must not be called live until a real submission arrives in the inbox and replying reaches the sender.
- ⬜ **Public contact email:** set `PUBLIC_CONTACT_EMAIL` if you want an email address shown. Until then the site shows only the form.
- ⬜ **Turnstile (recommended):** create a widget and set `PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`
- ⬜ **Optional KV namespace `CONTACT_KV`** for global rate limiting and backup of undelivered submissions
- ⬜ **Optional WAF rate-limit rule** for `POST /api/contact`
- ⬜ After launch: submit the sitemap in Google Search Console and Bing Webmaster Tools

## 3. Needs owner approval or verification

- ⬜ **Portfolio screenshots:** captured from the live public websites by `npm run screenshots` (overlays such as cookie banners and pop-ups were removed; page content is unaltered). Confirm you have permission from each client to show their site.
- ⬜ **Case study copy** (`src/data/projects.ts`): it describes publicly visible features of each site. Confirm it accurately reflects the scope you delivered, especially for RealtorFinder and Apex Aviation. No metrics, testimonials or quotes have been included.
- ⬜ **D&C Granite & Marble:** the engagement value ($2,500) is intentionally **not** published. Confirm the client is happy to be featured.
- ⬜ **RealtorFinder** is described as pre-launch / waitlist, matching the live site on 2026-10-12. Update the copy when its status changes.
- ⬜ **Founder details:** the About page uses only the approved description ("independent developer and entrepreneur"). Add a name or photo only when you want them published.
- ⬜ **Process and policy statements:** confirm you are comfortable committing to the following:
  - "You'll receive a clear written scope and price before any work begins"
  - "You work directly with the person designing and building your site"
  - What the free audit covers
- ⬜ **Pricing:** "Website Overhauls — Starting at $1,500" is published as instructed. The other services show "Individually quoted", "Scoped per project", or "Request a quote".
- ⬜ **Privacy policy:** written in plain language for this site's actual data handling. Have it reviewed for your jurisdiction, and update the provider names if you use something other than Cloudflare plus a transactional email provider.
- ⬜ **Turnaround times:** none are published. Add them only once approved.

## 4. Test results (local, 2026-10-12)

| Check                           | Result                                                                             |
| ------------------------------- | ---------------------------------------------------------------------------------- |
| `astro check` + Functions `tsc` | 0 errors, 0 warnings                                                               |
| ESLint                          | 0 problems                                                                         |
| Prettier                        | All files formatted                                                                |
| Vitest (unit)                   | 34 / 34 passed                                                                     |
| Production build                | 11 pages, success                                                                  |
| Playwright (desktop + mobile)   | 73 passed, 5 skipped (device-specific tests skipped on the other device), 0 failed |
| axe-core WCAG 2.1 A/AA          | 0 violations on all 10 pages (included in the Playwright run)                      |

Lighthouse 12 against the local production build (`wrangler pages dev`, simulated throttling). Real-world numbers on Cloudflare's network will differ, so re-run against the deployed URL.

| Page                          | Mobile (Perf / A11y / BP / SEO) | Desktop (Perf / A11y / BP / SEO) |
| ----------------------------- | ------------------------------- | -------------------------------- |
| `/`                           | 98 / 100 / 100 / 100            | 100 / 100 / 100 / 100            |
| `/services`                   | 99 / 100 / 100 / 100            | 100 / 100 / 100 / 100            |
| `/work/dc-granite-and-marble` | 100 / 100 / 100 / 100           | 100 / 100 / 100 / 100            |
| `/contact`                    | 98 / 100 / 100 / 100            | 100 / 100 / 100 / 100            |
