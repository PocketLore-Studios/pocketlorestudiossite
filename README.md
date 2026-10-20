# PocketLore Studios

One static Astro site, deployed with Cloudflare Workers. PocketLore keeps its
amber studio theme at `/`; Veilkeeper keeps its own theme, navigation, footer,
and full landing page at `/veilkeeper/`.

Veilkeeper's gameplay, roadmap, press, feedback, security, RSS, and all
development posts live under `/veilkeeper/`. Its original media URLs are
preserved under `/assets/`. The original `veilkeeper-landing` checkout is
unchanged; publish future game website updates from this repository.

## Development

Use Node 24 (see `.node-version`).

```sh
npm ci
npm run dev
```

The `justfile` carries over the Veilkeeper task shortcuts. On NixOS, `nix-shell`
provides Node 24 and `just`. Run `just` to list recipes, `just dev` for Astro,
`just wrangler-dev` for the full Worker preview with Turnstile test keys, or
`just ci` for install, generated types, type checks, Worker tests, build, and
smoke checks. `just wrangler-dev 8788` uses an alternate port and updates the
local origin allowlist to match. A real `RESEND_API_KEY` in `.dev.vars` enables
actual feedback delivery from that preview.

`just new-devlog devlog-11 "Post title"` creates a draft under `src/content/devlog/`;
add its media and replace the TODO fields before building. `just factsheet`
renders `veilkeeper-press-factsheet.pdf` from `promo/` using Chromium through Nix.
The printed short links retain the Veilkeeper domain and work through its
redirect Worker after cutover. Git helpers, including `just pr`, target this
repository. `just deploy` / `just deploy-dry-run` target PocketLore, while
`just deploy-veilkeeper-redirects` / `just deploy-veilkeeper-redirects-dry-run`
target the old domain's redirect Worker; follow the cutover order below.

`astro dev` previews pages only. To exercise Cloudflare headers, redirects, the
404 response, and the feedback API, use `npx wrangler dev`. Wrangler runs the
Astro build automatically. Runtime secrets can be placed in `.dev.vars` (see
`.dev.vars.example`). The feedback form uses the existing public Turnstile key;
for local form testing, override it with Cloudflare's test key and matching test
secret, and use local hostname/origin allowlists. Tests mock email and Turnstile
requests and send no real messages.

```sh
npm run types
npm run check
npm test
npm run build
npm run test:site
npx wrangler deploy --dry-run
npx wrangler deploy --config wrangler.veilkeeper.jsonc --dry-run
```

Only `dist/` is uploaded as public assets. Astro source, configuration, local
settings, and Worker code stay outside that directory. CI checks types, feedback
validation, redirect behavior, local links, game-page CSP compatibility, and the
public asset set. The built-site guard derives devlog pages and exact RSS links
from source content, checks the feed homepage, compares the sitemap with rendered
canonical pages, and verifies sharing images. Counts in its output are a report,
not a fixed requirement. The weekly external link check scans built HTML.

Recovery checkpoint (2026-10-20): type checks, all 31 Worker tests, the built-site
guard (23 HTML files and 13 RSS entries), and both deployment dry runs pass.
Chromium checks at 1440px and 390px also pass for the studio and game pages,
mobile navigation, devlog lightbox, and feedback category selection. The local
Worker confirms Steam attribution redirects, game CSP, and real 404 responses.
Third-party embeds and live feedback delivery still need production verification
after the production configuration in the launch checklist. No cutover has been
deployed.

## Release status and domain cutover

**Build passed** means automated checks passed for a recorded commit. It does
not establish that public routing, production secrets, embeds, or delivery work.
**Release verified** means the deployed commit passed the live acceptance checks
through its public domains, with dated evidence and studio-owner acceptance.

The migration is prepared; release verification remains pending. Follow the
[16-item launch acceptance checklist](docs/launch.md), including deployment
order, route expectations, and rollback criteria. Complete phases 1–3 before
calling the migration complete; continue monitoring in phase 4.

Green CI does not authorize domain routing, production-secret changes, or
replacement of the redirect Worker. These require deliberate studio-owner
approval for the specific release. GitHub workflows here only validate; review
Cloudflare build hooks separately. Routine site updates can use automatic
deployment after migration acceptance, without granting migration authority.
