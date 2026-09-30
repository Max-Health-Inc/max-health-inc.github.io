import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const { moves } = JSON.parse(readFileSync(join(ROOT, 'redirects.json'), 'utf8'));

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const page = ({ title, head = '', body, index = true }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${index ? '' : '<meta name="robots" content="noindex">\n'}<title>${escapeHtml(title)}</title>
${head}
<style>
:root { color-scheme: light dark; --bg: #ffffff; --fg: #1f2328; --muted: #59636e; --link: #0969da; }
@media (prefers-color-scheme: dark) { :root { --bg: #0d1117; --fg: #e6edf3; --muted: #9198a1; --link: #4493f8; } }
body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: var(--bg); color: var(--fg); font: 16px/1.5 system-ui, sans-serif; }
main { max-width: 40rem; padding: 0 16px; }
h1 { font-size: 1.25rem; margin: 0 0 .5rem; }
p { margin: .25rem 0; color: var(--muted); overflow-wrap: anywhere; }
a { color: var(--link); }
</style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>
`;

const redirectPage = (target) => page({
  title: 'Moved',
  head: [
    `<link rel="canonical" href="${escapeHtml(target)}">`,
    `<meta http-equiv="refresh" content="0; url=${escapeHtml(target)}">`,
    `<script>location.replace(${JSON.stringify(target)} + location.search + location.hash)</script>`,
  ].join('\n'),
  body: `<h1>This page has moved</h1>\n<p><a href="${escapeHtml(target)}">${escapeHtml(target)}</a></p>`,
});

const router = `const moves = ${JSON.stringify(moves.map(({ from, to }) => ({ from, to })))};
const path = location.pathname;
const lower = path.toLowerCase();
const move = moves.find(({ from }) => lower.startsWith(from.toLowerCase()) || lower + '/' === from.toLowerCase());
if (move) location.replace(move.to + path.slice(move.from.length) + location.search + location.hash);`;

const notFoundPage = page({
  title: 'Page not found',
  index: false,
  head: `<script>\n${router}\n</script>`,
  body: [
    '<h1>Page not found</h1>',
    ...moves.map(({ from, to }) => `<p>${escapeHtml(from)} now lives at <a href="${escapeHtml(to)}">${escapeHtml(to)}</a></p>`),
  ].join('\n'),
});

async function sitemapPages(to, sitemap) {
  const res = await fetch(new URL(sitemap, to));
  if (!res.ok) throw new Error(`${sitemap}: HTTP ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map(([, loc]) => loc.trim())
    .filter((loc) => loc.startsWith(to))
    .map((loc) => loc.slice(to.length));
}

const written = [];
for (const { from, to, pages = [], sitemaps = [] } of moves) {
  if (!/^\/[^/]+(\/[^/]+)*\/$/.test(from)) throw new Error(`"from" must be a non-root path ending in /: ${from}`);
  if (!to.endsWith('/')) throw new Error(`"to" must end in /: ${to}`);
  rmSync(join(ROOT, from), { recursive: true, force: true });
  const discovered = await Promise.all(sitemaps.map((s) => sitemapPages(to, s)));
  for (const rel of new Set([...pages, ...discovered.flat()])) {
    const file = join(ROOT, from, rel === '' || rel.endsWith('/') ? join(rel, 'index.html') : rel);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, redirectPage(to + rel));
    written.push(from + rel);
  }
}

writeFileSync(join(ROOT, '404.html'), notFoundPage);
writeFileSync(join(ROOT, '.nojekyll'), '');
console.log(`404.html + ${written.length} redirect pages:\n  ${written.join('\n  ')}`);
