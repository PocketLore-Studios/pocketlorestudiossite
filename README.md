# PocketLore Studios

One static Astro site, deployed with Cloudflare Workers. PocketLore keeps its
amber studio theme at `/`; Veilkeeper keeps its own theme, navigation, footer,
and full landing page at `/veilkeeper/`.

Veilkeeper's gameplay, roadmap, press, feedback, security, RSS, and all 13
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
validation, redirect behavior, local links, game-page CSP compatibility, RSS,
and the public asset set. The weekly external link check scans built HTML.

Recovery checkpoint (2026-10-20): type checks, all 31 Worker tests, the built-site
guard (23 HTML files and 13 RSS entries), and both deployment dry runs pass.
Chromium checks at 1440px and 390px also pass for the studio and game pages,
mobile navigation, devlog lightbox, and feedback category selection. The local
Worker confirms Steam attribution redirects, game CSP, and real 404 responses.
Third-party embeds and live feedback delivery still need production verification
after the hostname and secret configuration below. No cutover has been deployed.

## Domain cutover

The cutover is prepared but has not been deployed. Keep both domain registrations.

1. In the `pocketlorestudiossite` Cloudflare Workers Build settings, use this
   repository, `npm ci` for install, and `npm run deploy` for deployment. The
   Wrangler `build.command` builds Astro. Keep its existing PocketLore domains
   attached. The new assets directory is `dist/`, not the repository root.
2. Add `pocketlorestudios.com` and `www.pocketlorestudios.com` to the existing
   Turnstile widget's allowed hostnames. Set `TURNSTILE_SECRET` and
   `RESEND_API_KEY` on the **PocketLore** Worker using the dashboard or
   `npx wrangler secret put NAME`. Secrets on the old Worker do not transfer
   automatically. `PUBLIC_TURNSTILE_SITE_KEY` may override the public key at
   build time if the widget changes.
3. Deploy PocketLore first with `npm run deploy`. Verify `/veilkeeper/`, its
   navigation, a devlog, `/veilkeeper/rss.xml`, a feedback submission, and `/play`.
4. Disable the old Veilkeeper repository's automatic deployments so they cannot
   restore the old site over the redirect Worker. Then run
   `npm run deploy:veilkeeper-redirects` from this repository. This replaces the
   existing Worker named `veilkeepergame`, retaining its domain attachments.
   Verify both apex and `www` are attached to that Worker before cutover; this
   configuration deliberately does not create or move custom domains.

| Incoming URL | Destination | Status |
| --- | --- | --- |
| `veilkeepergame.com/` | `pocketlorestudios.com/veilkeeper/` | 308 |
| `veilkeepergame.com/play` or `/play/` | Existing Veilkeeper Steam store page | 302 |
| `veilkeepergame.com/devlog/devlog-09/` | `pocketlorestudios.com/veilkeeper/devlog/devlog-09/` | 308 |
| `veilkeepergame.com/devlog/post.html?slug=devlog-09` | Same migrated post | 308 |
| `veilkeepergame.com/gameplay/`, `/roadmap/`, `/press/`, `/feedback/`, `/security/` | Matching `/veilkeeper/` page | 308 |
| `veilkeepergame.com/rss.xml` | `pocketlorestudios.com/veilkeeper/rss.xml` | 308 |
| `pocketlorestudios.com/play` or `/veilkeeper/play` | Existing Veilkeeper Steam store page | 302 |

The redirect Worker accepts both the apex and `www` domains and preserves query
parameters, including Steam UTM attribution. Unknown paths keep their identity
and reach a real 404. Do not add a catch-all domain forwarding rule ahead of it:
that would bypass the `/play` exception. Remove or adjust any existing rules
that take precedence during cutover. Old cached cross-origin feedback forms
must be reloaded at their new URL; the active form submits on PocketLore.

No mail DNS records, sending domains, or `@veilkeepergame.com` contact addresses
change. The feedback sender remains `feedback.veilkeepergame.com` and delivery
still goes to `support@veilkeepergame.com`.

Rollback: redeploy the original Veilkeeper repository to `veilkeepergame` and
re-enable its build hook. Keep the old checkout until the migration is verified.
Permanent redirects may be cached, so verify the new site before switching.
