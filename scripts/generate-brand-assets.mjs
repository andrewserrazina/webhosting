// Renders raster brand assets from the SVG logo using headless Chromium.
// Usage: node scripts/generate-brand-assets.mjs
// Outputs: public/og/northline-digital.png, public/apple-touch-icon.png,
//          public/icon-192.png, public/icon-512.png, public/brand/northline-mark.png,
//          public/favicon.ico
import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const pub = (p) => `${root}public/${p}`;
// Fonts are inlined as data URIs because about:blank pages cannot load file:// URLs.
const fontUrl = async (p) =>
  `data:font/woff2;base64,${(await readFile(`${root}node_modules/${p}`)).toString('base64')}`;

const logoReversed = await readFile(pub('brand/northline-logo-reversed.svg'), 'utf8');
const favicon = await readFile(pub('favicon.svg'), 'utf8');
const mark = await readFile(pub('brand/northline-mark.svg'), 'utf8');

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();

async function render(html, width, height, out, { transparent = false } = {}) {
  await page.setViewportSize({ width, height });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const buf = await page.screenshot({ omitBackground: transparent });
  if (out) await writeFile(out, buf);
  return buf;
}

const fonts = `
@font-face{font-family:'Fraunces';src:url('${await fontUrl('@fontsource-variable/fraunces/files/fraunces-latin-opsz-normal.woff2')}') format('woff2');font-weight:100 900}
@font-face{font-family:'Inter';src:url('${await fontUrl('@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')}') format('woff2');font-weight:100 900}`;

await mkdir(pub('og'), { recursive: true });

// Open Graph image (1200x630)
await render(
  `<!doctype html><html><head><style>${fonts}
  *{margin:0;box-sizing:border-box}
  body{width:1200px;height:630px;background:#0B1F3A;color:#FAFAF7;font-family:Inter;position:relative;overflow:hidden}
  .logo{position:absolute;top:72px;left:80px;height:44px}
  .logo svg{height:100%;width:auto}
  h1{position:absolute;left:80px;bottom:150px;font-family:Fraunces;font-weight:500;font-size:84px;line-height:1.02;letter-spacing:-0.025em;max-width:860px}
  h1 em{font-style:normal;color:#D6AC65}
  p{position:absolute;left:80px;bottom:78px;font-size:24px;color:#B9C4D6}
  .rule{position:absolute;left:80px;bottom:126px;width:64px;height:2px;background:#D6AC65}
  .mark{position:absolute;right:-40px;top:60px;width:520px;height:520px;opacity:.1}
  </style></head><body>
  <div class="mark">${mark.replace('#0B1F3A', '#FAFAF7')}</div>
  <div class="logo">${logoReversed}</div>
  <h1>Better Websites.<br><em>Stronger Businesses.</em></h1>
  <div class="rule"></div>
  <p>Website design, development &amp; digital solutions</p>
  </body></html>`,
  1200,
  630,
  pub('og/northline-digital.png'),
);

const iconHtml = (size, pad = 0) => `<!doctype html><html><body style="margin:0;background:transparent">
  <div style="width:${size}px;height:${size}px;padding:${pad}px;box-sizing:border-box">${favicon.replace('<svg ', '<svg style="width:100%;height:100%;display:block" ')}</div></body></html>`;

await render(iconHtml(180), 180, 180, pub('apple-touch-icon.png'));
await render(iconHtml(192), 192, 192, pub('icon-192.png'));
await render(iconHtml(512), 512, 512, pub('icon-512.png'));
const ico32 = await render(iconHtml(32), 32, 32, null, { transparent: true });

// Plain mark on transparent background (used as the structured-data logo).
await render(
  `<!doctype html><html><body style="margin:0;background:transparent"><div style="width:512px;height:512px;padding:48px;box-sizing:border-box">${mark.replace('<svg ', '<svg style="width:100%;height:100%;display:block" ')}</div></body></html>`,
  512,
  512,
  pub('brand/northline-mark.png'),
  { transparent: true },
);

// favicon.ico containing a single 32x32 PNG image.
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // count
header.writeUInt8(32, 6); // width
header.writeUInt8(32, 7); // height
header.writeUInt8(0, 8); // palette
header.writeUInt8(0, 9); // reserved
header.writeUInt16LE(1, 10); // color planes
header.writeUInt16LE(32, 12); // bpp
header.writeUInt32LE(ico32.length, 14); // size
header.writeUInt32LE(22, 18); // offset
await writeFile(pub('favicon.ico'), Buffer.concat([header, ico32]));

await browser.close();
console.log('Brand assets generated.');
