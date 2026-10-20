#!/usr/bin/env bash
# Astro isolates deployment assets in dist/. Check the actual built output for
# private files and verify that rendered pages link to real migrated assets.
set -euo pipefail
case "${1:-}" in ''|--working-copy) ;; *) echo "usage: $0 [--working-copy]" >&2; exit 2 ;; esac
cd "$(git rev-parse --show-toplevel)"
npm run build
npm run test:site
