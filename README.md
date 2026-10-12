# Northline Digital

**Better Websites. Stronger Businesses.**

Marketing website for Northline Digital, a web design and development agency for small and growing businesses. It is a static Astro site with one Cloudflare Pages Function that handles the contact / free website audit form.

- **Stack:** Astro 7 (static output) · TypeScript · Tailwind CSS 4 · Lucide icons · Cloudflare Pages + Pages Functions
- **Client-side JS:** about 1 KB gzipped on most pages and about 3.5 KB on `/contact`, all first-party (mobile menu, scroll reveal, contact form). No frameworks, no trackers.
- **Fonts:** Fraunces + Inter, self-hosted through Fontsource (no third-party requests).

---

## Quick start

```bash
npm install
cp .env.example .env          # set PUBLIC_* values for local builds (optional)
npm run dev                   # http://localhost:4321 (pages only, no /api)
```

To run the site **with the contact form endpoint** in Cloudflare's local runtime:

```bash
cp .env.example .dev.vars     # runtime secrets for wrangler (never commit this file)
npm run build
npm run preview               # wrangler pages dev → http://localhost:8788
```

## Scripts

| Command                | What it does                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| `npm run dev`          | Astro dev server                                                                                          |
| `npm run build`        | Production build to `dist/`                                                                               |
| `npm run preview`      | Serves `dist/` together with `functions/` through Wrangler (same as production)                           |
| `npm run check`        | Type checks: `astro check` for the site, `tsc` for the Pages Functions                                    |
| `npm run lint`         | ESLint (TypeScript + Astro)                                                                               |
| `npm run format:check` | Prettier check (`npm run format` to fix)                                                                  |
| `npm test`             | Vitest unit tests: form validation and the contact API handler                                            |
| `npm run test:e2e`     | Playwright browser tests (desktop + mobile). Run `npm run build` first                                    |
| `npm run verify`       | Runs all of the above in order                                                                            |
| `npm run screenshots`  | Re-captures the portfolio screenshots from the live client sites                                          |
| `npm run brand:assets` | Rebuilds the outlined wordmark, favicons, touch icons and OG image (needs `pip install fonttools brotli`) |

## Project structure

```
functions/api/contact.ts      Cloudflare Pages Function entry (POST /api/contact)
src/server/                   Contact handler + email providers (unit tested)
src/lib/contact.ts            Shared validation rules (used by browser and server)
src/data/                     Site config, services, portfolio content ← edit copy here
src/components/               Layout, UI, section and brand components
src/layouts/BaseLayout.astro  HTML shell, SEO tags, header/footer
src/pages/                    Routes (/, /services, /work, /work/[slug], /about, /contact, /privacy, 404)
src/assets/work/              Portfolio screenshots (optimized to WebP at build time)
public/                       Favicons, OG image, brand SVGs, _headers
scripts/                      Screenshot capture and brand asset generation
tests/unit, tests/e2e         Vitest and Playwright suites
```

### Editing content

- **Services and prices:** `src/data/services.ts`. Care plan pricing deliberately reads "Request a quote".
- **Portfolio case studies:** `src/data/projects.ts`. Only add metrics, testimonials or quotes once they are verified and the client has approved them.
- **Contact email, domain, Turnstile key:** environment variables (below). Nothing is hard-coded.

## Environment variables

See `.env.example` for the full annotated list.

### Build-time (public, baked into the HTML)

| Variable                    | Required | Purpose                                                                                                            |
| --------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| `PUBLIC_SITE_URL`           | Yes      | Canonical origin, e.g. `https://northlinedigital.com`. Used for canonical URLs, Open Graph, sitemap and robots.txt |
| `PUBLIC_CONTACT_EMAIL`      | No       | Public email shown in the footer, contact page and error messages. Hidden when empty                               |
| `PUBLIC_TURNSTILE_SITE_KEY` | No       | Shows the Cloudflare Turnstile spam check on the contact form                                                      |

### Runtime (Pages Functions; set as encrypted secrets)

| Variable                                       | Required           | Purpose                                                             |
| ---------------------------------------------- | ------------------ | ------------------------------------------------------------------- |
| `EMAIL_PROVIDER`                               | Yes                | `resend` (default) or `postmark`                                    |
| `EMAIL_API_KEY`                                | Yes                | Resend API key or Postmark server token                             |
| `CONTACT_TO_EMAIL`                             | Yes                | Inbox that receives inquiries (comma-separate several for Resend)   |
| `CONTACT_FROM_EMAIL`                           | Yes                | Verified sender, e.g. `Northline Digital <forms@yourdomain.com>`    |
| `TURNSTILE_SECRET_KEY`                         | If Turnstile is on | Server-side Turnstile verification                                  |
| `PUBLIC_SITE_URL`                              | Recommended        | Also set at runtime so the origin check knows the production domain |
| `ALLOWED_ORIGINS`                              | No                 | Comma-separated extra origins allowed to post the form              |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_SECONDS` | No                 | Defaults: 5 submissions per 600 seconds per IP                      |

Optional binding: **`CONTACT_KV`** (KV namespace). When it is bound, rate limiting is shared across all Cloudflare locations, and any submission that cannot be emailed is kept for 30 days under `undelivered:<referenceId>`. Without it, rate limiting falls back to per-instance memory.

## How the contact form works

1. The browser validates input with the same rules the server uses (`src/lib/contact.ts`), then POSTs JSON to `/api/contact`. Without JavaScript, the form still posts normally and the server responds with a redirect or an HTML error page.
2. The function (`src/server/contact-handler.ts`) runs these checks in order: origin check → size limit → honeypot field → minimum fill time (3 s) → per-IP rate limit (stores a hashed IP, never the raw address) → full validation → Turnstile (if configured).
3. It sends a notification email through the configured provider with `Reply-To` set to the visitor, so replying in your inbox goes straight to them.
4. **Submissions are never silently discarded.** The visitor only sees a success message after the provider accepts the email. If email is not configured (HTTP 503) or delivery fails (HTTP 502), the visitor gets a clear "not delivered" message with the fallback email. The submission is also written to the function logs and, if `CONTACT_KV` is bound, to KV. The only submissions that get a success response without delivery are honeypot hits, which are logged as spam.

## Deploying to Cloudflare Pages

> Not deployed yet. These steps need the owner's Cloudflare account and domain.

1. **Create the project:** Cloudflare dashboard → Workers & Pages → Create → Pages → _Connect to Git_ → choose `andrewserrazina/webhosting`.
2. **Build settings:**
   - Framework preset: _Astro_ (or None)
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `/`
   - Environment variable `NODE_VERSION` = `22`
3. **Variables and secrets** (Settings → Variables and Secrets, for both _Production_ and _Preview_): set everything in the tables above. Add the `PUBLIC_*` values as plain variables (they are read at build time). Add `EMAIL_API_KEY` and `TURNSTILE_SECRET_KEY` as **secrets**.
4. **Functions:** detected automatically from `/functions`. `wrangler.toml` sets `pages_build_output_dir` and the compatibility date.
5. **Optional KV:** `npx wrangler kv namespace create CONTACT_KV`, then bind it under Settings → Bindings → KV namespace → variable name `CONTACT_KV`. You can also uncomment the block in `wrangler.toml`.
6. Deploy, then test the contact form on the `*.pages.dev` URL before connecting the domain.

CLI alternative (after `npx wrangler login`): `npm run build && npx wrangler pages deploy dist --project-name northline-digital`.

### Custom domain

1. Pages project → Custom domains → _Set up a custom domain_ → enter the domain (for example `northlinedigital.com`, plus `www`).
2. If the domain's DNS is on Cloudflare, records are created automatically. Otherwise add the CNAME that Cloudflare shows at your DNS host.
3. Choose one canonical host (apex or `www`) and redirect the other with a Cloudflare _Redirect Rule_.
4. Set `PUBLIC_SITE_URL` to the canonical origin and **redeploy** so canonical URLs, the sitemap and Open Graph tags use it.

### Form delivery setup (Resend example)

1. Create a Resend account → Domains → add your sending domain (e.g. `yourdomain.com`) → add the SPF/DKIM DNS records it shows → wait until it reads _Verified_.
2. Create an API key with _Sending access_.
3. In Cloudflare Pages set `EMAIL_PROVIDER=resend`, `EMAIL_API_KEY=<key>`, `CONTACT_TO_EMAIL=<your inbox>`, `CONTACT_FROM_EMAIL="Northline Digital <forms@yourdomain.com>"`, then redeploy.
4. Submit a real test inquiry. Confirm it arrives, that replying goes to the visitor's address, and that the success screen shows a reference ID.

**Postmark** works the same way: verify a sender signature or domain, use the _Server API token_ as `EMAIL_API_KEY`, and set `EMAIL_PROVIDER=postmark`.

### Spam protection (recommended)

- **Turnstile:** Cloudflare dashboard → Turnstile → Add widget → add your domain(s) and `*.pages.dev` → set `PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` → redeploy. The CSP in `public/_headers` already allows `challenges.cloudflare.com`.
- **Edge rate limiting:** for stronger protection, add a WAF rate-limiting rule for `POST /api/contact` (for example 10 requests per minute per IP → Block).

## Testing

```bash
npm run verify
```

Playwright starts `wrangler pages dev dist` automatically, so the real Pages Function runs during the browser tests. No email credentials are provided in tests. The live endpoint is exercised on its "not configured" path, and the success and failure UI is covered by mocked responses. The provider integrations (Resend and Postmark) are covered by unit tests with a mocked `fetch`.

If Chromium is installed somewhere non-standard, set `CHROMIUM_PATH`.

## Brand assets

- Logo: `src/components/brand/Logo.astro`. It combines a geometric "N" mark whose right stem rises into a north-pointing marker with an outlined Fraunces wordmark, so it has no font dependency.
- Standalone files: `public/brand/northline-logo.svg`, `northline-logo-reversed.svg`, `northline-mark.svg`, `northline-mark.png`
- Favicons: `public/favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`
- Social image: `public/og/northline-digital.png` (1200×630)
- Palette: navy `#0B1F3A`, warm white `#FAFAF7`, muted gold `#D6AC65`, slate `#64748B`, white. On light backgrounds, small gold text uses a darker tone (`#85642A`) to keep AA contrast.

See [`LAUNCH_CHECKLIST.md`](./LAUNCH_CHECKLIST.md) for what remains before going live.
