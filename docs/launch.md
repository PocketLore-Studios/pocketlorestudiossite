# PocketLore Website Launch

Priority: **High**. Due: **before 1UpState in November 2026**; confirm the event
date before scheduling the cutover. Status: **release verification pending**.

Track this checklist for the actual release. Leave items unchecked until there
is evidence; local tests cannot complete a live check. Record URLs/status codes,
deployment IDs, browser results, and receipt timestamps without secret values
or subscriber details. A passing build does not authorize a migration.

| Release record | Value |
| --- | --- |
| Commit tested / deployed | Pending |
| Studio owner / operator / UTC date | Pending |
| Previous PocketLore / Veilkeeper deployment IDs | Pending |
| New PocketLore / redirect Worker deployment IDs | Pending |
| Explicit approval to cut over the old domain | Pending |
| Evidence location / outstanding issues | Pending |
| Release acceptance by studio owner | Pending |

## 1. Preflight

- [ ] Record the release commit, operator, launch window, previous deployments,
  and a recovery path for both Workers. Keep the old checkout and both domain
  registrations. Freeze changes that could invalidate the tested release.
- [ ] Run `npm run types`, `npm run check`, `npm test`, `npm run build`,
  `npm run test:site`, and both Wrangler deployment dry runs from the README.
  Record **build passed** with the commit; dry runs do not verify remote secrets.
- [ ] Verify the PocketLore Worker has `TURNSTILE_SECRET` and `RESEND_API_KEY`
  configured, and allow both PocketLore apex and `www` in the existing Turnstile
  widget. Wrangler's `secrets.required` blocks deployment when these bindings
  are absent; it cannot establish that their values work. Provision through the
  dashboard or `npx wrangler secret put NAME` deliberately: secret changes can
  deploy a Worker version. Keep mail DNS, contact addresses, and the existing
  `feedback.veilkeepergame.com` sender unchanged.
- [ ] Inspect Cloudflare domain attachments, Redirect Rules, Bulk Redirects,
  legacy forwarding/Page Rules, Workers Builds, GitHub actions, deployment
  hooks, schedules, and other deploy credentials. Identify everything able to
  replace either Worker and record how to stop it. Confirm both old-domain
  apex and `www` belong to the existing `veilkeepergame` Worker; remove or adjust
  rules that would bypass its `/play` exception during the approved cutover.

## 2. Deploy and verify PocketLore

- [ ] Deploy the selected commit to `pocketlorestudiossite` first, leaving the
  old site live. Use this repository, `npm ci`, and `npm run deploy`; Wrangler
  builds Astro and serves only `dist/`. Keep existing PocketLore domains
  attached and record the resulting deployment ID.
- [ ] Through both PocketLore public hostnames, verify `/`, `/veilkeeper/`, all
  game navigation, a devlog and its media, RSS, press assets, security.txt, and
  the `/play` variants below. Verify unknown document URLs return HTTP 404,
  including browser navigation requests. Confirm `POST /api/feedback` reaches
  the API, while GET, trailing-slash, and unknown `/api/*` paths return JSON
  404. Matching static assets should still load with expected cache/security
  headers; the game pages must receive their CSP. This checks the deployed
  `run_worker_first: ["/api/*"]` and `404-page` configuration, beyond unit tests.
- [ ] Submit real feedback using the production form; verify its confirmation
  and actual receipt at `support@veilkeepergame.com`. Check safe rejection of
  invalid/expired tokens, unexpected origins, and oversized submissions, then
  verify the form can obtain a fresh token and retry. Use controlled requests,
  review current abuse/rate-limit controls, and avoid load testing production.
  Turnstile and body limits are not a general request rate limiter.
- [ ] Check mobile Safari, Firefox, Chromium, keyboard-only navigation, focus,
  mobile layouts, form validation, image/video loading, and console/network
  failures. Complete a Kit signup and confirmation with a designated test
  subscriber; confirm receipt in Kit and clean up the test record afterward.
  Check blocked-embed fallbacks and public sharing previews too.

## 3. Cut over and accept the old domain

- [ ] After phases 1–2 pass, record explicit studio-owner cutover approval.
  Disable the old repository's automatic builds and any other old-site deploy
  paths identified in preflight. Run `npm run deploy:veilkeeper-redirects` from
  this repository and record its deployment ID. It replaces the existing
  `veilkeepergame` Worker; it does not create or move custom domains or mail DNS.
- [ ] Verify every route class in the matrix below through both old-domain
  apex and `www`, following redirects to the final response. Include query
  strings, Steam UTM attribution, fragments in a browser, slash variants,
  historical media/download links, and links from actual printed/shared
  materials. Inspect each hop so a broad forwarding rule cannot hide a wrong
  status or destination. Unknown URLs must finish at an HTTP 404.
- [ ] Verify all migrated page canonicals, Open Graph URLs/images, internal
  links, RSS channel/item links, and indexability on the deployed site. Fetch
  `/robots.txt`, `/sitemap-index.xml`, and every referenced sitemap (currently
  `/sitemap-0.xml`). Indexable pages should use PocketLore URLs; the legacy
  `post.html` shim deliberately remains `noindex`. Verify historical PDF links
  against where they were actually published; the repository-root factsheet
  is a local publishing artifact, not a public website download route.
- [ ] Record dated evidence for phases 1–3 and studio-owner acceptance of the
  deployed commit as **release verified**. Leave unresolved failures explicit;
  do not infer acceptance from CI or a single successful homepage request.

## 4. Post-launch

- [ ] Verify Search Console ownership for both sites and old-domain variants,
  submit the new sitemap index, and use Change of Address only after redirects
  are live and its checks pass. Google's instructions support a domain moving
  into a path on another domain; handle apex and `www` as instructed. Record
  acceptance or any tool limitation rather than changing routing merely to
  satisfy an assumption about the tool.
- [ ] Review both Workers' errors, unexpected 404s, feedback delivery, and Kit
  signup results after launch and the following day. Monitor Search Console
  indexing and traffic over subsequent weeks; investigate broken URL mappings.
- [ ] Record an accessibility and performance baseline on the deployed site.
  Fix material keyboard, contrast, loading, or layout problems. Use available
  field Core Web Vitals when traffic supplies them; a fresh deployment's lab
  result alone cannot establish field performance.
- [ ] Recheck printed QR/shared links before the event, assign any remaining
  issues, and keep the old domain and redirects active. Google recommends
  keeping redirects for at least a year; existing links and email make retaining
  the Veilkeeper domain useful beyond that minimum.

## Route expectations

Test both apex and `www` for each applicable domain. Permanent content moves use
308; promotional `/play` links use 302 and continue directly to Steam. The free
alpha buttons continue to itch.io, independently of `/play`.

| Incoming URL | Destination / final behavior | First status |
| --- | --- | --- |
| `veilkeepergame.com/` | `pocketlorestudios.com/veilkeeper/` | 308 |
| Old `/play` or `/play/` | `https://store.steampowered.com/app/4515130/Veilkeeper/` | 302 |
| Old `/gameplay/`, `/roadmap/`, `/press/`, `/feedback/`, `/security/` | Matching `/veilkeeper/` page | 308 |
| Old `/devlog/devlog-09/` | New `/veilkeeper/devlog/devlog-09/` | 308 |
| Old `/devlog/post.html?slug=devlog-09&utm_source=old` | New post, retaining `utm_source=old` | 308 |
| Old `/rss.xml` | New `/veilkeeper/rss.xml` | 308 |
| Old `/assets/...`, `/favicon.png`, `/.well-known/security.txt` | Same path on PocketLore | 308 |
| Old `/robots.txt`, `/sitemap-index.xml`, `/sitemap-0.xml` | Same path on PocketLore | 308 |
| Old unknown path | Same path under `/veilkeeper/`, finishing at 404 | 308 |
| PocketLore `/play`, `/play/`, `/veilkeeper/play`, `/veilkeeper/play/` | Steam, retaining query attribution | 302 |

Old cached feedback forms must be reloaded at their new URL. Forwarding the old
POST preserves its method, but the new API rejects cross-origin submissions.

## Stop and rollback criteria

Stop before switching the old domain if any phase 1–2 requirement fails.
After cutover, consider rollback if primary pages are repeatedly inaccessible,
important historical URLs fail systematically, or feedback delivery cannot be
restored promptly. The studio owner records the decision and affected deployment
IDs. An isolated cosmetic defect can be repaired with a normal site update.

Restore the previous PocketLore deployment if the new site is the fault. Restore
the previous Veilkeeper deployment (or redeploy its preserved checkout to
`veilkeepergame`) if reverting the cutover; re-enable its build hook only after
the rollback decision. Recheck public routes and delivery. Keep working migrated
PocketLore paths available because permanent redirects can remain cached even
after the old Worker is restored. If Search Console Change of Address was
submitted, follow its cancellation guidance as part of the rollback.

## References

- [Cloudflare static-asset routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/)
  and [404 handling](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/).
- [Required secrets and deployment validation](https://developers.cloudflare.com/workers/configuration/secrets/).
- [Turnstile server-side validation, token expiry, and reuse](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).
- [Google site moves and redirect retention](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes)
  and [Change of Address requirements](https://support.google.com/webmasters/answer/9370220?hl=en).
