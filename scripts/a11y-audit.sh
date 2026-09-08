#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:1313}"
TAGS="${AXE_TAGS:-wcag2a,wcag2aa}"
OUT_DIR="${AXE_OUT_DIR:-a11y-reports}"
MAX_PAGES="${AXE_MAX_PAGES:-0}"

mkdir -p "$OUT_DIR"

URLS=()
while IFS= read -r line; do
  URLS+=("$line")
done < <(
  python3 - "$BASE_URL" <<'PY'
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

base = sys.argv[1].rstrip("/")
url = f"{base}/sitemap.xml"

with urllib.request.urlopen(url) as resp:
    data = resp.read()

root = ET.fromstring(data)
ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}

# `hugo server` does not always rewrite baseURL in sitemap.xml, so the sitemap
# can advertise https://joegornick.com/... while you believe you are auditing
# localhost. Following it verbatim silently audits the LIVE SITE and reports the
# result as if it were your local build. Force every URL onto the requested base.
b = urllib.parse.urlsplit(base)
rewritten = 0
for loc in root.findall(".//sm:loc", ns):
    if not loc.text:
        continue
    u = urllib.parse.urlsplit(loc.text.strip())
    if (u.scheme, u.netloc) != (b.scheme, b.netloc):
        rewritten += 1
    print(urllib.parse.urlunsplit((b.scheme, b.netloc, u.path, u.query, "")))

if rewritten:
    print(
        f"warning: rewrote {rewritten} sitemap URL(s) onto {base} "
        f"(sitemap.xml advertised a different host)",
        file=sys.stderr,
    )
PY
)

if [[ "$MAX_PAGES" -gt 0 ]]; then
  URLS=("${URLS[@]:0:$MAX_PAGES}")
fi

if [[ "${#URLS[@]}" -eq 0 ]]; then
  echo "No URLs found in sitemap: $BASE_URL/sitemap.xml" >&2
  exit 1
fi

fail=0
for url in "${URLS[@]}"; do
  safe_name=$(echo "$url" | sed -e 's#https\?://##' -e 's#[^A-Za-z0-9._-]#_#g')
  out_file="$OUT_DIR/${safe_name}.json"

  echo "Auditing: $url"
  if ! npx --yes @axe-core/cli "$url" --tags "$TAGS" --save "$out_file" --exit; then
    fail=1
  fi
  echo "Report: $out_file"
  echo ""
done

exit "$fail"
