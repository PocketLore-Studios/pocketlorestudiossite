#!/usr/bin/env bash
# Deployment asset guard (OPS-9): fails if wrangler would upload a private local file as a public asset.
#
# wrangler.jsonc serves the repo root as Workers static assets, filtered only by .assetsignore, so any
# local file that .assetsignore misses gets published. This runs wrangler's own asset selection
# (`deploy --dry-run`, which uploads nothing) on a temporary copy and reads its per-path
# "Ignoring asset" decisions, so the result is wrangler's, not a re-implementation of its rules.
#
#   check-deploy-assets.sh                 tracked files plus placeholder private files (CI)
#   check-deploy-assets.sh --working-copy  a copy of this working copy as it is, local files included;
#                                          also fails if any untracked file would be uploaded
#
# The repo itself is never modified and nothing is deployed. Telemetry is off, and wrangler's log goes to
# the temp dir (wrangler deletes logs older than 30 days from whatever log directory it writes to).
# Override the wrangler command with WRANGLER=...; the default is pinned.
set -euo pipefail

WRANGLER=${WRANGLER:-npx --yes wrangler@4.148.0}
# Private local files that must never be uploaded; CI plants a placeholder at each.
PRIVATE_FILES=(
	.claude/settings.local.json
	.claude/settings.json
	.idea/workspace.xml
	.git/config
	.wrangler/state/v3/probe
)
# No file under these local directories may be uploaded, whatever its name.
PRIVATE_DIRS=(.claude/ .idea/ .git/ .wrangler/ .github/)
# Control: a planted file on a public path must appear in the upload set, or the check itself is broken.
PROBE=assets/__deploy-asset-probe__.txt

mode=${1:-}
case "$mode" in ''|--working-copy) ;; *) echo "usage: $0 [--working-copy]" >&2; exit 2 ;; esac
root=$(git rev-parse --show-toplevel)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
site=$tmp/site

if [ "$mode" = --working-copy ]; then
	cp -a "$root/." "$site"
else
	mkdir -p "$site"
	(cd "$root" && git ls-files -z | xargs -0 cp --parents -t "$site" --)
	for p in "${PRIVATE_FILES[@]}"; do
		mkdir -p "$site/$(dirname "$p")"
		echo '{"placeholder": "must never be uploaded"}' > "$site/$p"
	done
fi
echo probe > "$site/$PROBE"

# Everything wrangler will see, listed before it runs (it may create .wrangler/ while running).
(cd "$site" && find . -mindepth 1 \( -type f -o -type l \) -printf '%P\n' | LC_ALL=C sort) > "$tmp/files"

if ! (cd "$site" && WRANGLER_LOG=debug WRANGLER_LOG_PATH="$tmp/logs" WRANGLER_SEND_METRICS=false \
		$WRANGLER deploy --dry-run --outdir "$tmp/out") > "$tmp/wrangler.txt" 2>&1; then
	cat "$tmp/wrangler.txt"; echo "FAIL: wrangler deploy --dry-run failed"; exit 1
fi
sed 's/\x1b\[[0-9;]*m//g' "$tmp/wrangler.txt" > "$tmp/plain.txt"

fail=0
adir=$(sed -n 's/.*Read [0-9]* files from the assets directory //p' "$tmp/plain.txt" | head -1)
if [ "$adir" != "$site" ]; then
	echo "FAIL: wrangler's assets directory is '${adir:-?}', not the repo root; update this check"; fail=1
fi
sed -n 's/^.*Ignoring asset: //p' "$tmp/plain.txt" | LC_ALL=C sort -u > "$tmp/ignored"
LC_ALL=C comm -23 "$tmp/files" "$tmp/ignored" > "$tmp/assets"

if ! grep -qxF "$PROBE" "$tmp/assets"; then
	echo "FAIL: the control file $PROBE is not in the upload set, so this check cannot see uploads"; fail=1
fi
for p in "${PRIVATE_FILES[@]}"; do
	if grep -qxF "$p" "$tmp/assets"; then echo "FAIL: private file would be uploaded: $p"; fail=1; fi
done
for d in "${PRIVATE_DIRS[@]}"; do
	while IFS= read -r p; do echo "FAIL: file under private directory $d would be uploaded: $p"; fail=1; done \
		< <(awk -v d="$d" 'index($0, d) == 1' "$tmp/assets")
done
if [ "$mode" = --working-copy ]; then
	(cd "$root" && git ls-files) | LC_ALL=C sort > "$tmp/tracked"
	while IFS= read -r p; do
		[ "$p" = "$PROBE" ] || { echo "FAIL: untracked local file would be uploaded: $p"; fail=1; }
	done < <(LC_ALL=C comm -23 "$tmp/assets" "$tmp/tracked")
fi

echo "upload set ($(grep -cvxF "$PROBE" "$tmp/assets") files, control excluded):"
grep -vxF "$PROBE" "$tmp/assets" | sed 's/^/  /'
if [ "$fail" = 0 ]; then echo "PASS: no private file in the deployment asset set"; else echo "FAIL"; fi
exit "$fail"
