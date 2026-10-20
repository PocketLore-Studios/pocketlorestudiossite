# PocketLore Studios + Veilkeeper - task runner
#
# Local (NixOS): `nix-shell` provides Node 24 and just.
# `just ci` runs the same checks as .github/workflows/deploy-assets.yml.

set shell := ["bash", "-euo", "pipefail", "-c"]
set positional-arguments

# Repo slug for `pr`: origin is the SSH host alias `github-pocketlore`, which gh
# cannot auto-resolve, so --repo is passed explicitly.
repo := "PocketLore-Studios/pocketlorestudiossite"

# List available recipes
default:
    @just --list

# ── Development ─────────────────────────────────────────────

# Install dependencies from the lockfile (CI-safe, reproducible)
install:
    npm ci

# Start the dev server with hot reload
dev:
    npm run dev

# Serve the last production build locally
preview port="4321":
    npm run preview -- --port "$1"

# Local /api/feedback uses the test key throughout Wrangler's build and rebuilds.
# Builds with Cloudflare's Turnstile *test* site key (the page otherwise defaults
# to the real production key) and runs with the matching test secret, so the
# widget passes on localhost. RESEND_FROM_ADDRESS / FEEDBACK_DESTINATION come
# from wrangler.jsonc; put a real RESEND_API_KEY in a gitignored .dev.vars for a
# real send, or omit it to exercise the Resend non-2xx (502) error path.
# Preview the Worker and assets with local Turnstile test keys
wrangler-dev port="8787":
    PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA npx --no-install wrangler dev --local --port "$1" \
        --var "ALLOWED_ORIGINS:http://localhost:$1,http://127.0.0.1:$1" \
        --var ALLOWED_HOSTNAMES:example.com,localhost,127.0.0.1 \
        --var TURNSTILE_SECRET:1x0000000000000000000000000000000AA \
        --var TURNSTILE_ACTION:

# Remove build output and caches
clean:
    rm -rf dist .astro node_modules/.vite

# ── Quality gates ───────────────────────────────────────────

# Regenerate Worker runtime and binding types from wrangler.jsonc
types:
    npm run types

# The Worker has its own tsconfig targeting workerd rather than the DOM.
# Check Astro, TypeScript, content frontmatter, and Worker types
check: types
    npm run check

# Turnstile and Resend are stubbed using Node's runner; no network or email.
# Test feedback validation, delivery failures, and domain redirects
test-worker:
    npm test

# Production build (also validates the devlog content schema)
build:
    npm run build

# Assert every route the site promises actually exists in dist/
smoke:
    test -f dist/index.html
    test -f dist/veilkeeper/index.html
    test -f dist/veilkeeper/devlog/index.html
    test -f dist/veilkeeper/security/index.html
    test -f dist/veilkeeper/feedback/index.html
    test -f dist/veilkeeper/press/index.html
    test -f dist/veilkeeper/roadmap/index.html
    test -f dist/veilkeeper/gameplay/index.html
    test -f dist/veilkeeper/rss.xml
    test -f dist/veilkeeper/devlog/post.html
    test -f dist/veilkeeper/devlog/post-redirect.js
    test -f dist/.well-known/security.txt
    test -f dist/favicon.png
    @ls dist/_astro/*.css >/dev/null || { echo "no hashed CSS bundle in dist/_astro"; exit 1; }
    test -f dist/404.html
    test -f dist/sitemap-index.xml
    test -f dist/robots.txt
    test -f dist/_headers
    test -f dist/_redirects
    npm run test:site

# Full pipeline matching CI, including dependency installation
ci: install check test-worker build smoke

# ── Deployment ──────────────────────────────────────────────

# Build and deploy PocketLore (Wrangler runs the configured Astro build)
deploy:
    npm run deploy

# Preview what wrangler would upload without deploying
deploy-dry-run:
    npm run deploy -- --dry-run

# Replace the old Veilkeeper site with redirects AFTER PocketLore is live (README)
deploy-veilkeeper-redirects:
    npm run deploy:veilkeeper-redirects

# Validate the redirect Worker without publishing it
deploy-veilkeeper-redirects-dry-run:
    npm run deploy:veilkeeper-redirects -- --dry-run

# ── Authoring ───────────────────────────────────────────────

# Usage: just new-devlog devlog-11 "Post title"
# Tip: for animated media, add an optional `video: "/assets/devlog/<slug>.mp4"`
# field to the frontmatter - `image` then serves as the poster/OG image.
# Scaffold a Veilkeeper devlog draft (add media and replace TODO fields)
new-devlog slug title="TODO":
    node scripts/new-devlog.mjs "$1" "$2"

# Render the press factsheet PDF from promo/factsheet-source.html.
#
# Not part of `just ci`: it needs a browser and produces a binary,
# so it runs on demand when the factsheet copy or its screenshots change. Pulls
# Chromium itself rather than assuming it is installed (NixOS), so this recipe
# works from outside nix-shell too. ./veilkeeper-press-factsheet.pdf is the only
# copy; promo/ holds the editable source and its banner image.
# Render veilkeeper-press-factsheet.pdf using Chromium through Nix
factsheet:
    nix-shell -p chromium nodejs_24 --run 'node promo/build-factsheet.mjs'
    @echo "factsheet rendered - check both pages before sending it to press"

# ── Git convenience ───────────────────────────────────────────────

# Show the repository's Conventional Commit convention (used from the first commit).
commit-help:
    @echo "Commit format:"
    @echo "  type(optional-scope): description"
    @echo
    @echo "Allowed types:"
    @echo "  feat      New functionality"
    @echo "  fix       Bug fixes"
    @echo "  content   Devlog posts, copy, and site assets"
    @echo "  ui        Interface and visual presentation"
    @echo "  refactor  Internal restructuring without behavior changes"
    @echo "  perf      Performance improvements"
    @echo "  docs      Documentation"
    @echo "  build     Dependencies, deploys, and packaging"
    @echo "  ci        Continuous integration and automation"
    @echo "  chore     General maintenance"
    @echo "  revert    Revert a previous commit"
    @echo
    @echo "Examples:"
    @echo "  feat(feedback): add turnstile validation"
    @echo "  content(devlog): add devlog 09"
    @echo "  ui: tighten homepage hero spacing"

# Show the working-tree summary, then prompt for a message and commit everything.
commit:
    #!/usr/bin/env bash
    set -euo pipefail
    git status -s
    echo
    git diff --stat
    echo
    read -rp "Commit message: " msg
    [ -n "$msg" ] || { echo "Aborted: empty message"; exit 1; }
    git add -A
    git commit -m "$msg"

# Pick a local branch from a numbered menu and switch to it.
switch:
    #!/usr/bin/env bash
    set -euo pipefail
    PS3="Switch to which branch? "
    select b in $(git branch --format='%(refname:short)'); do
        [ -n "${b:-}" ] || { echo "Invalid selection"; exit 1; }
        git switch "$b"
        break
    done

# Create and switch to a new branch (prompts for the name).
new:
    #!/usr/bin/env bash
    set -euo pipefail
    read -rp "New branch name: " name
    [ -n "$name" ] || { echo "Aborted: empty name"; exit 1; }
    git switch -c "$name"

# Fast-forward the current branch from origin (no merge commits).
pull:
    git pull --ff-only origin $(git branch --show-current)

# Push the current branch to origin.
push:
    git push origin $(git branch --show-current)

# High-level view of what's changed.
status:
    git status -s
    @echo
    git diff --stat

# --repo is set because origin is the SSH host alias `github-pocketlore`, which
# gh cannot auto-resolve. --fill drafts title/body from commits. Needs gh authed.
# Open a PR from the current branch into the given base (default: main).
pr base="main":
    gh pr create --repo {{ repo }} --base "$1" --head $(git branch --show-current) --fill
