import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const [slug, title = 'TODO'] = process.argv.slice(2);
if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  throw new Error('Use a lowercase slug with letters, numbers, and hyphens (for example devlog-11).');
}

const path = `src/content/devlog/${slug}.md`;
const file = fileURLToPath(new URL(`../${path}`, import.meta.url));
await writeFile(file, `---
label: "TODO e.g. Devlog 11"
title: ${JSON.stringify(title)}
date: ${new Date().toISOString().slice(0, 10)}
image: "/assets/devlog/${slug}.png"
alt: "TODO describe the image"
summary: "TODO one-sentence summary (used on the homepage card, archive, OG description, and RSS)"
---

TODO write the post in markdown. \`##\` headings and \`-\` lists match the site styles.
`, { flag: 'wx' });
console.log(`Created ${path}; add public/assets/devlog/${slug}.png before building.`);
console.log('Also check SITE.currentFocus in src/lib/site.ts still matches what is being built.');
