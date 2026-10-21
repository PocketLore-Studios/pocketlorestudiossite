# Veilkeeper domain cutover

Status: **redirect Worker deployed; custom-domain browser verification pending**.

John Serwatka confirmed that Disable builds was enabled for the old Worker,
ran the redirect deployment dry run successfully, then deployed the prepared
Worker on 2026-10-21. Cloudflare records activation at 15:05:36 UTC. This was a
studio-owner-operated cutover, not an automatic consequence of passing CI.

## Source and recovery

| Item | Recorded value |
| --- | --- |
| Source base | `a34b076e1112cf48db7f3c4c69a2835b29cd8b6e` |
| Worker / config | `veilkeepergame` / `wrangler.veilkeeper.jsonc` |
| New deployment | `6e6ff924-b344-49ec-b121-582fbeb9de40` |
| New active version, 100% | `dc6176c3-e432-4ef2-a856-cc943ca98434` |
| Previous deployment | `688db17c-5821-4115-b4c1-797707d4bd8d` |
| Previous version | `acd3b19a-d96f-404e-bf09-f7fde674b1e8` |
| Retained custom hostnames | `veilkeepergame.com`, `www.veilkeepergame.com` |
| Worker URL | `https://veilkeepergame.patient-bush-06d1.workers.dev` |

The two existing uncommitted PocketLore copy edits do not affect this Worker.
It has no static asset directory or required runtime bindings. The deployment
does not request DNS or email changes. No Git changes were pushed by Codex.

To restore the recorded previous Worker version if required:

```sh
npx wrangler rollback acd3b19a-d96f-404e-bf09-f7fde674b1e8 --name veilkeepergame
```

Permanent redirects may remain cached after a rollback; retain the migrated
PocketLore paths. Keep Disable builds enabled unless deliberately restoring
the old website's publishing workflow.

## Verified after deployment

- Cloudflare's deployment API and Wrangler confirm that the recorded redirect
  version is active at 100%.
- Both custom hostnames remain attached to `veilkeepergame`.
- Live requests to the Worker URL confirm 308 redirects for the root,
  gameplay, roadmap, press, feedback, security, devlog archive/post, RSS,
  media, security.txt, and sitemap index to their expected PocketLore paths.
- `/play` and `/play/` return 302 directly to the existing Steam app and
  preserve UTM attribution. They do not pass through PocketLore.
- The legacy `devlog/post.html?slug=devlog-09` link redirects to the migrated
  post, removes the obsolete `slug` parameter, and preserves other parameters.
- Media stays under `/assets/`; the security contact and sitemap retain their
  root paths. An unknown old URL maps to the corresponding unknown path under
  `/veilkeeper/`, whose 404 behavior was previously verified on PocketLore.
- The old repository's GitHub main commit matched the audited checkout.
  Its only active workflows were CI and link checking, neither of which
  deploys. No repository webhooks were present. The studio owner separately
  confirmed disabling Cloudflare builds before deployment.

## Pending acceptance

- Automated requests to both custom domains still receive Cloudflare's
  browser challenge (403, `cf-mitigated: challenge`). This prevents verifying
  the public-hostname redirect chain from this environment. Check `/`,
  `/press/`, `/play`, and `/play/` on apex and `www` in a normal browser, plus
  historical shared links. A successful Worker URL check alone does not prove
  that no other edge rule takes precedence on the custom hostnames.
- Cloudflare's OAuth credential could not read Builds, Redirect Rules,
  Bulk Redirects, or Page Rules (403). The full forwarding-rule inventory is
  unverified. Before cutover, the owner confirmed both hostnames reached the
  old site and `/play` reached Steam; post-cutover browser checks remain open.
- The audit found `dev.veilkeepergame.com` routes pointing to the same Worker.
  Its post-cutover behavior has not been separately verified.
- Search Console migration, remaining browser/integration checks, and final
  release acceptance remain on the [launch checklist](../launch.md).
