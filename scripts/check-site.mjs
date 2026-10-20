import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = resolve(root, 'dist');
const origin = 'https://pocketlorestudios.com';
const parser = new XMLParser({
  isArray: name => ['item', 'sitemap', 'url'].includes(name)
});
function parseXml(xml, label) {
  assert.equal(XMLValidator.validate(xml), true, `Invalid XML: ${label}`);
  return parser.parse(xml);
}
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory()
    ? walk(resolve(directory, entry.name)) : resolve(directory, entry.name)))).flat();
}
async function exists(file) { try { return (await stat(file)).isFile(); } catch { return false; } }
const files = await walk(dist);
for (const path of [
  'index.html', '404.html', 'veilkeeper/index.html', 'veilkeeper/gameplay/index.html',
  'veilkeeper/roadmap/index.html', 'veilkeeper/press/index.html',
  'veilkeeper/feedback/index.html', 'veilkeeper/security/index.html',
  'veilkeeper/devlog/index.html', 'veilkeeper/rss.xml', 'sitemap-index.xml'
]) assert(await exists(resolve(dist, path)), `Missing required route: ${path}`);
for (const asset of await walk(resolve(root, 'public'))) {
  const path = asset.slice(resolve(root, 'public').length + 1);
  assert(await exists(resolve(dist, path)), `Missing public asset: ${path}`);
}
for (const file of files) {
  const relative = file.slice(dist.length + 1);
  assert(relative === '.well-known/security.txt' || !relative.split('/').some(part => part.startsWith('.')), `Private asset: ${relative}`);
  assert(!/\.(?:astro|ts|tsx|json|jsonc|map|md|yml)$/.test(relative), `Source/config asset: ${relative}`);
  assert(!/(?:node_modules|worker|scripts|package-lock|wrangler)/.test(relative), `Private asset: ${relative}`);
}

let htmlCount = 0;
const indexableUrls = new Set();
for (const file of files.filter(file => extname(file) === '.html')) {
  const html = await readFile(file, 'utf8');
  const path = file.slice(dist.length).replace(/index\.html$/, '');
  const isShim = path.endsWith('/post.html');
  const is404 = path === '/404.html';
  if (!isShim) {
    assert(html.includes('href="https://pocketlorestudios.com/'), `Missing canonical: ${path}`);
    if (!is404) assert(html.includes(`rel="canonical" href="${origin}${path}"`), `Wrong canonical: ${path}`);
    if (!is404) {
      assert(!/<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(html), `Page is not indexable: ${path}`);
      indexableUrls.add(origin + path);
      const ogImage = html.match(/<meta property="og:image" content="([^"]+)"/);
      assert(ogImage, `Missing sharing image: ${path}`);
      const imageUrl = new URL(ogImage[1]);
      assert.equal(imageUrl.origin, origin, `Sharing image uses the wrong domain: ${path}`);
      assert(await exists(resolve(dist, '.' + decodeURIComponent(imageUrl.pathname))), `Missing sharing image: ${path}`);
    }
  }
  // Check rendered navigation, scripts, stylesheets, fonts, media and posters.
  for (const match of html.matchAll(/\s(?:href|src|poster|action)="([^"#]+)"/g)) {
    const url = new URL(match[1].replaceAll('&amp;', '&'), origin + path);
    assert(!['veilkeepergame.com', 'www.veilkeepergame.com'].includes(url.hostname), `Link still uses the old domain on ${path}: ${url}`);
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
const channel = parseXml(feed, 'RSS').rss.channel;
assert.equal(channel.link, origin + '/veilkeeper/', 'RSS homepage must link to Veilkeeper');
const items = channel.item ?? [];
const feedLinks = items.map(item => item.link);
assert.equal(new Set(feedLinks).size, feedLinks.length, 'Duplicate RSS destinations');
const posts = (await walk(resolve(root, 'src/content/devlog'))).filter(file => extname(file) === '.md');
const expectedPostLinks = [];
for (const post of posts) {
  const slug = post.slice(resolve(root, 'src/content/devlog').length + 1).replace(/\.md$/, '');
  assert(await exists(resolve(dist, 'veilkeeper/devlog', slug, 'index.html')), `Missing devlog page: ${slug}`);
  expectedPostLinks.push(`${origin}/veilkeeper/devlog/${slug}/`);
}
assert.deepEqual([...feedLinks].sort(), expectedPostLinks.sort(), 'RSS destinations must match source devlogs exactly');
for (const item of items) assert.equal(item.guid, item.link, `RSS permalink differs from its destination: ${item.link}`);

const sitemapIndex = parseXml(await readFile(resolve(dist, 'sitemap-index.xml'), 'utf8'), 'sitemap index');
const sitemapLinks = [];
for (const entry of sitemapIndex.sitemapindex.sitemap ?? []) {
  const url = new URL(entry.loc);
  assert.equal(url.origin, origin, 'Sitemap uses the wrong domain');
  const file = resolve(dist, '.' + decodeURIComponent(url.pathname));
  assert(file.startsWith(dist + '/'), 'Sitemap path escapes public output');
  const sitemap = parseXml(await readFile(file, 'utf8'), url.pathname);
  sitemapLinks.push(...(sitemap.urlset.url ?? []).map(entry => entry.loc));
}
assert.equal(new Set(sitemapLinks).size, sitemapLinks.length, 'Duplicate sitemap destinations');
assert.deepEqual(sitemapLinks.sort(), [...indexableUrls].sort(), 'Sitemap must match canonical public pages');
const security = await readFile(resolve(dist, '.well-known/security.txt'), 'utf8');
assert(security.includes(`Canonical: ${origin}/.well-known/security.txt`), 'Security contact canonical still points to the old domain');
assert(security.includes(`Policy: ${origin}/veilkeeper/security/`), 'Security policy URL has not migrated');
assert((await readFile(resolve(root, 'wrangler.jsonc'), 'utf8')).includes('"directory": "./dist"'), 'Deploy must serve the built output only');
console.log(`PASS: ${htmlCount} HTML pages, ${posts.length} source-derived RSS destinations, sitemap, local links, sharing images, CSP, and ${files.length} public assets checked.`);
