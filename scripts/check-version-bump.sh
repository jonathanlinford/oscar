#!/usr/bin/env bash
#
# Fail if manifest.json "version" has not been bumped vs. the base commit.
# Guards main against "oops, forgot to bump" on both PRs and direct pushes.
#
# Base commit is picked from GitHub Actions env:
#   - pull_request: BASE_REF (the target branch, e.g. "main")
#   - push:         BEFORE_SHA (the previous tip of the branch)
#
# Falls back to HEAD^ for local runs.
#
# Usage:
#   BASE_REF=main bash scripts/check-version-bump.sh         # PR-style
#   BEFORE_SHA=abc123 bash scripts/check-version-bump.sh     # push-style
#   bash scripts/check-version-bump.sh                       # local (HEAD^)

set -euo pipefail

read_version_at() {
  # $1: git revision (e.g. "origin/main", "abc123", "HEAD^")
  git show "$1:manifest.json" 2>/dev/null \
    | grep '"version"' \
    | head -1 \
    | sed -E 's/.*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/'
}

read_version_current() {
  grep '"version"' manifest.json \
    | head -1 \
    | sed -E 's/.*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/'
}

EVENT="${GITHUB_EVENT_NAME:-local}"
BASE_SHA=""

case "$EVENT" in
  pull_request)
    # BASE_REF is the target branch name (e.g. "main"). Fetch it so the
    # compare actually has commits to look at.
    if [ -z "${BASE_REF:-}" ]; then
      echo "error: BASE_REF not set for pull_request event" >&2
      exit 1
    fi
    git fetch --no-tags --depth=1 origin "$BASE_REF" >/dev/null 2>&1 || true
    BASE_SHA="origin/$BASE_REF"
    ;;
  push)
    BASE_SHA="${BEFORE_SHA:-}"
    # First push to a branch reports an all-zero "before" sha — skip.
    if [ -z "$BASE_SHA" ] || [ "$BASE_SHA" = "0000000000000000000000000000000000000000" ]; then
      echo "No base commit (first push) — skipping version check"
      exit 0
    fi
    ;;
  *)
    BASE_SHA="HEAD^"
    ;;
esac

if ! git rev-parse --verify "$BASE_SHA" >/dev/null 2>&1; then
  echo "Base ref $BASE_SHA not available — skipping version check"
  exit 0
fi

OLD=$(read_version_at "$BASE_SHA")
NEW=$(read_version_current)

echo "Previous version: ${OLD:-<none>}"
echo "Current version:  ${NEW:-<none>}"

if [ -z "$NEW" ]; then
  echo "::error::Could not read current version from manifest.json" >&2
  exit 1
fi

if [ -z "$OLD" ]; then
  echo "Previous manifest.json not present at base — treating as initial version"
  exit 0
fi

if [ "$OLD" = "$NEW" ]; then
  echo "::error::manifest.json version has not been bumped (still $NEW). Update manifest.json (and package.json) before merging, and add a CHANGELOG entry." >&2
  exit 1
fi

echo "Version bump OK: $OLD -> $NEW"
