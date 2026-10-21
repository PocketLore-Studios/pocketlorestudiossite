# Initial PocketLore deployment

Status: **site and feedback verified; full migration acceptance pending**.

PocketLore was deployed on 2026-10-20 at 17:15:16 UTC, following the studio
owner's instruction to bootstrap the Worker with its production secrets.
Verification continued on 2026-10-21. This initial deployment left the old
Veilkeeper Worker unchanged. John Serwatka subsequently performed the
[domain cutover](2026-10-21-veilkeeper-cutover.md) on 2026-10-21. No Git changes
were pushed by Codex.

## Source and recovery

| Item | Recorded value |
| --- | --- |
| Source base | `467c0b5f59931b497283b3def627c5bb824fc5fb` |
| Worker | `pocketlorestudiossite` |
| New deployment | `764197e3-482b-4a74-b015-2bc2fa9e906f` |
| New version | `dc9faa54-0c99-4708-a7e1-c09e83234b23` |
| Previous deployment | `19b19bde-9b47-4c8b-8cd1-472355d25f18` |
| Previous version | `e4bd7062-0808-48d8-939e-434704ba8cbc` |
| Public hostnames | `pocketlorestudios.com`, `www.pocketlorestudios.com` |
| Worker URL | `https://pocketlorestudiossite.patient-bush-06d1.workers.dev` |

The deployed working copy also included two pre-existing, uncommitted edits:

- `src/lib/site.ts`: current focus changed to “Making the enemy ai more capable”.
- `src/pages/index.astro`: the founder introduction now says “He shares the
  development process openly, from early experiments and technical challenges
  to the decisions that shape each game.”

These edits remain uncommitted. A future Git deployment from the source base
alone will not include them. The ignored production secrets file is outside
`dist/` and was not uploaded as a public asset.

## Verified

- Local type checks, all 31 Worker tests, production build, the built-site
  guard, and both deployment dry runs passed before deployment.
- Deployment used `npx wrangler deploy --secrets-file .env.production`.
  Cloudflare's settings API confirms `TURNSTILE_SECRET` and `RESEND_API_KEY`
  are runtime bindings of type `secret_text`; no values are recorded here.
- Both PocketLore custom hostnames remain attached to this Worker.
- The existing Turnstile widget (`0x4AAAAAAD7jYecPL3c82-lW`) now allows
  `pocketlorestudios.com`, `www.pocketlorestudios.com`, and `veilkeepergame.com`.
  Its managed mode and existing Veilkeeper hostname were preserved.
- Through the deployed Worker URL, the studio homepage, all main game pages,
  the devlog archive and latest post, security.txt, robots.txt, sitemap index,
  sitemap, and sharing image returned 200. Rendered canonical URLs point to
  PocketLore, and game pages receive their CSP.
- All four `/play` variants returned 302 to the expected Steam app and retained
  the supplied UTM query parameter.
- Unknown studio/game document URLs returned 404, including requests marked
  as browser navigation. GET requests to `/api/feedback`, its trailing-slash
  variant, and an unknown API route returned JSON 404.
- Controlled feedback requests rejected a foreign origin with 403, a missing
  Turnstile token with 400, and an oversized body with 413. These checks did not
  send mail. The live RSS feed contained 13 posts and the corrected game URL.
- On 2026-10-21, John Serwatka confirmed the public site works in his browser,
  the feedback form loads and accepts a submission, and the resulting feedback
  arrived at support. This verifies the production form and email-delivery flow
  through the public site, beyond the automated Worker URL checks.

## Verification limitation

Automated requests to the public PocketLore domain on 2026-10-21 received
Cloudflare's browser challenge: HTTP 403, `cf-mitigated: challenge`, title
“Just a moment...”. Chromium encountered the same challenge. The studio owner's
successful browser submission and confirmed receipt provide the live feedback
evidence. The automated challenge does not establish a visitor-facing failure.

## Pending acceptance

- Cloudflare returned 403 to the Wrangler OAuth credential for the Builds API.
  Dashboard build settings could not be read or saved through that credential.
  The studio owner indicated they should be saved, but the exact production
  and preview deployment commands remain unconfirmed. `wrangler versions upload`
  creates a version without promoting it to production; `npm run deploy` is
  the intended production publish command.
- Expired-token retry behavior and production abuse/rate-limit controls still
  need review. The successful submission does not establish those behaviors.
- Kit signup/confirmation, remaining browser compatibility checks, final
  custom-domain redirect verification, Search Console migration, and final
  studio-owner release acceptance
  remain on the [launch checklist](../launch.md).

Use the recorded previous version if a PocketLore rollback is needed. For the
old domain's previous version, see the cutover record. Follow the launch
checklist's rollback criteria.
