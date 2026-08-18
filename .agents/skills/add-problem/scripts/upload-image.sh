#!/usr/bin/env bash
#
# upload-image.sh — put a problem figure in the `problem_images` storage bucket
# and print the public URL to paste into a statement.
#
# The Supabase MCP has no storage tool: it speaks SQL, and object bytes do not
# live in Postgres. Storage is therefore the one part of publishing a problem
# that goes over Supabase's REST API rather than the MCP. Problem *rows* still
# go through the MCP only — that rule is unchanged.
#
# Usage:
#   upload-image.sh <image-file> [dest-path]
#
# dest-path defaults to problems/<basename>. Give it the house shape
# `problems/<problem-id>/<figure-name>.png` so a stray object is traceable to
# the problem it belongs to:
#
#   upload-image.sh ccc24j5-fig1.png problems/ccc24j5/patch.png
#
# Uploads are upserts, so re-cropping a figure and re-running overwrites in
# place and every statement already pointing at that URL picks up the new image.
#
# Credentials come from wmoj-app/main/.env.local (NEXT_PUBLIC_SUPABASE_URL and
# SUPABASE_SECRET_KEY), or from those same names already exported in the
# environment, which take precedence. The project uses the new-style
# `sb_secret_…` keys, which are NOT JWTs: they go in the `apikey` header, and
# putting one in `Authorization: Bearer` gets a 400 "Invalid Compact JWS".

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
ENV_FILE="$REPO_ROOT/main/.env.local"

BUCKET="problem_images"

# Enforced by the bucket itself (storage.buckets) — a violation is a 400 from
# the API, so checking here only changes where you find out.
MAX_IMAGE_BYTES=5242880
ALLOWED_MIME="image/png image/jpeg image/gif image/webp"

die() { printf 'upload-image.sh: %s\n' "$*" >&2; exit 1; }

need() { command -v "$1" >/dev/null 2>&1 || die "'$1' is required but not installed"; }

read_env() {
  local key="$1"
  [ -f "$ENV_FILE" ] || die "cannot find $ENV_FILE — run this from a checkout of wmoj-app"
  sed -n "s/^${key}=//p" "$ENV_FILE" | head -1 | tr -d '[:space:]'
}

[ $# -ge 1 ] || die "usage: upload-image.sh <image-file> [dest-path]"

need curl
file="$1"
[ -f "$file" ] || die "no such file: $file"

dest="${2:-problems/$(basename "$file")}"
case "$dest" in
  /*|*..*) die "dest-path must be a relative path with no '..': $dest" ;;
esac

bytes=$(wc -c <"$file" | tr -d ' ')
[ "$bytes" -le "$MAX_IMAGE_BYTES" ] || \
  die "$file is ${bytes}B, over the bucket's ${MAX_IMAGE_BYTES}B cap — downscale it"

# Trust the file's magic bytes, not its extension: a .png that is really a PDF
# uploads fine and then renders as a broken image on the problem page.
mime=$(file --brief --mime-type "$file")
case " $ALLOWED_MIME " in
  *" $mime "*) ;;
  *) die "$file is $mime; the bucket accepts only: $ALLOWED_MIME" ;;
esac

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-$(read_env NEXT_PUBLIC_SUPABASE_URL)}"
SUPABASE_KEY="${SUPABASE_SECRET_KEY:-$(read_env SUPABASE_SECRET_KEY)}"
[ -n "$SUPABASE_URL" ] || die "NEXT_PUBLIC_SUPABASE_URL is not set in $ENV_FILE"
[ -n "$SUPABASE_KEY" ] || die "SUPABASE_SECRET_KEY is not set in $ENV_FILE"
SUPABASE_URL="${SUPABASE_URL%/}"

body=$(mktemp); trap 'rm -f "$body"' EXIT
code=$(curl -sS -o "$body" -w '%{http_code}' \
  -X POST "$SUPABASE_URL/storage/v1/object/$BUCKET/$dest" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Content-Type: $mime" \
  -H "Cache-Control: max-age=31536000" \
  -H "x-upsert: true" \
  --data-binary "@$file")

if [ "$code" != "200" ]; then
  printf 'upload-image.sh: upload failed (HTTP %s)\n' "$code" >&2
  cat "$body" >&2; printf '\n' >&2
  exit 1
fi

url="$SUPABASE_URL/storage/v1/object/public/$BUCKET/$dest"

printf 'uploaded  %s  (%s, %sB)\n' "$dest" "$mime" "$bytes" >&2
printf 'markup    <img size="100" src="%s" />\n' "$url" >&2
printf '%s\n' "$url"
