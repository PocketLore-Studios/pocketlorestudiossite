import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = resolve(root, 'dist');
const origin = 'https://pocketlorestudios.com';
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory()
    ? walk(resolve(directory, entry.name)) : resolve(directory, entry.name)))).flat();
}
async function exists(file) { try { return (await stat(file)).isFile(); } catch { return false; } }
const files = await walk(dist);
assert(files.length > 50, 'Build the site before checking deployment assets');
for (const file of files) {
  const relative = file.slice(dist.length + 1);
  assert(relative === '.well-known/security.txt' || !relative.split('/').some(part => part.startsWith('.')), `Private asset: ${relative}`);
  assert(!/\.(?:astro|ts|tsx|json|jsonc|map|md|yml)$/.test(relative), `Source/config asset: ${relative}`);
  assert(!/(?:node_modules|worker|scripts|package-lock|wrangler)/.test(relative), `Private asset: ${relative}`);
}

let htmlCount = 0;
for (const file of files.filter(file => extname(file) === '.html')) {
  const html = await readFile(file, 'utf8');
  const path = file.slice(dist.length).replace(/index\.html$/, '');
  const isShim = path.endsWith('/post.html');
  const is404 = path === '/404.html';
  if (!isShim) {
    assert(html.includes('href="https://pocketlorestudios.com/'), `Missing canonical: ${path}`);
    if (!is404) assert(html.includes(`rel="canonical" href="${origin}${path}"`), `Wrong canonical: ${path}`);
  }
  // Check rendered navigation, scripts, stylesheets, fonts, media and posters.
  for (const match of html.matchAll(/\s(?:href|src|poster|action)="([^"#]+)"/g)) {
    const url = new URL(match[1].replaceAll('&amp;', '&'), origin + path);
    if (url.origin !== origin || url.pathname.startsWith('/api/')) continue;
    if (['/play', '/play/', '/veilkeeper/play', '/veilkeeper/play/'].includes(url.pathname)) continue;
    const target = resolve(dist, '.' + decodeURIComponent(url.pathname));
    assert(target.startsWith(dist + '/') || target === dist, `Path escapes assets: ${url}`);
    assert(await exists(target) || await exists(resolve(target, 'index.html')), `Broken local URL on ${path}: ${url.pathname}`);
  }
  if (path.startsWith('/veilkeeper/') && !isShim) {
    assert(!/style="/.test(html), `Inline style blocked by game CSP: ${path}`);
    for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
      assert(script[1].includes('src=') || !script[2].trim(), `Inline script blocked by game CSP: ${path}`);
    }
    assert(html.includes('href="/veilkeeper/gameplay/"'), `Game navigation missing: ${path}`);
  }
  htmlCount++;
}
const steam = 'https://store.steampowered.com/app/4515130/Veilkeeper/';
for (const file of ['public/_redirects', 'src/lib/site.ts', 'worker/veilkeeper-redirects.ts']) {
  assert((await readFile(resolve(root, file), 'utf8')).includes(steam), `Steam destination differs: ${file}`);
}
const feed = await readFile(resolve(dist, 'veilkeeper/rss.xml'), 'utf8');
assert(!feed.includes('https://veilkeepergame.com'), 'RSS still points to the old domain');
assert.equal((feed.match(/<item>/g) || []).length, 13, 'A migrated devlog is missing from RSS');
const security = await readFile(resolve(dist, '.well-known/security.txt'), 'utf8');
assert(security.includes(`Canonical: ${origin}/.well-known/security.txt`), 'Security contact canonical still points to the old domain');
assert(security.includes(`Policy: ${origin}/veilkeeper/security/`), 'Security policy URL has not migrated');
assert((await readFile(resolve(root, 'wrangler.jsonc'), 'utf8')).includes('"directory": "./dist"'), 'Deploy must serve the built output only');
console.log(`PASS: ${htmlCount} HTML pages, 13 RSS entries, local links, CSP, Steam links, and ${files.length} public assets checked.`);
