#!/usr/bin/env bash
# Writes the review inputs that prompt.md points at, for every reviewer job in
# .github/workflows/post-review.yml:
#
#   .post-review/files.md       the posts in the PR, each marked new or edited
#   .post-review/changes.diff   the diff of the edited posts against the base
#
# Needs POSTS (the changes job's JSON list) and BASE_REF, and a checkout of the
# PR head with full history.

set -euo pipefail

mkdir -p .post-review
jq -r '.[] | "- `\(.path)` (\(.status))"' <<<"$POSTS" > .post-review/files.md

mapfile -t edited < <(jq -r '.[] | select(.status == "edited") | .path' <<<"$POSTS")
if [ ${#edited[@]} -gt 0 ]; then
  git diff -M -U5 "origin/${BASE_REF}...HEAD" -- "${edited[@]}" > .post-review/changes.diff
else
  echo "Every post in this pull request is new." > .post-review/changes.diff
fi
