# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Oscar is a Chrome Manifest V3 extension that auto-closes the landing-page tabs desktop apps leave behind after firing their deep links (Slack, Zoom, Teams, etc.). Plain vanilla JavaScript — **no bundler, no transpiler, no runtime `node_modules`**. Never introduce tooling that requires `npm install` to load the extension.

## Commands

```bash
npm run build              # or: bash scripts/build.sh — zips the extension to dist/oscar-<version>.zip
npm test                   # node:test runner — matching.js, analytics.js, action-presenter.js
bash scripts/check-version-bump.sh  # CI guard: fails if manifest.json version hasn't moved vs HEAD^
```

Requires **Node 21+** for `npm test` (glob expansion in `node --test`). CI runs on Node 22. No lint step. No bundler.

### Development loop

1. Load unpacked from `chrome://extensions` (Developer mode on).
2. Edit source in place.
3. Reload the extension's card after editing `background.js`, `content.js`, `manifest.json`, or shared modules. `options.html/js/css` and `popup.html/js/css` pick up on next page open. **Content-script edits also require reloading the page under test.**

### Packaging (important)

`scripts/build.sh` zips a **hardcoded file list** (`EXTENSION_FILES` + `ICON_FILES`). If you add a new source or icon file, add it to that list or it will not ship. The script reads the version from `manifest.json` and fails loudly on missing files.

## Architecture

Six JS modules split across the service worker, the injected content script, and the options/popup pages. They communicate via `chrome.storage` and `chrome.runtime.sendMessage`:

- **`background.js`** — service worker. `importScripts('analytics.js', 'action-presenter.js')` to share helpers with the options page. Owns per-tab icon/badge state (delegated to `action-presenter.js`), records analytics, and executes `chrome.tabs.remove`. It does **not** drive the countdown — the content script does.
- **`content.js`** — IIFE content script, `run_at: document_idle`. Loads rules from `chrome.storage.sync`, matches via `OscarMatching` helpers against `location.href` + `document.body.innerText`, and on match creates a Shadow-DOM overlay toast with the countdown and Cancel button. Re-checks via a `MutationObserver` for up to `OBSERVER_TIMEOUT_MS` (15s) to catch late-rendered page text. A synchronous `checking` lock + `queuedRuleId` guard against double-matching.
- **`matching.js`** — pure helpers (`globToRegex`, `hostMatches`, `textMatches`) extracted so `content.js` and `test/matching.test.js` can share them. Attached to `self.OscarMatching`.
- **`action-presenter.js`** — pure helpers (`markTabClosing`, `resetTab`) that take a `chrome.action`-shaped API as their first argument. Lets `test/action-presenter.test.js` validate the exact MV3 parameter shapes (e.g. `setTitle({tabId, title})` — **not** `{tabId, text}`) without a real extension context.
- **`options.js` / `options.html`** — master/detail rules list with drag-to-reorder + expand-to-edit rows, rule library, theme picker, stats dashboard. Reads `OscarAnalytics` and `OscarTheme` off `window`. Rules have no `name` field — the domain pattern is the label.
- **`popup.js` / `popup.html`** — toolbar popup: "add rule from current tab" button + mini stats teaser.

### Shared modules (IIFE + global pattern)

`analytics.js` and `theme.js` are deliberately plain IIFEs that attach their API to `self.OscarAnalytics` / `window.OscarTheme`. This is the only way to share code between the service worker (via `importScripts`) and regular pages (via `<script>`) without a build step. **Do not convert these to ES modules** — MV3 service workers + `importScripts` do not play well with `type=module`, and introducing a bundler is explicitly rejected in CONTRIBUTING.md.

### Message protocol (content → background)

- `MATCH_PENDING {ruleId, ruleName, delayMs}` → background sets the red "closing" icon + tooltip.
- `MATCH_TICK {seconds}` → background updates the badge text.
- `CANCEL_MATCH {ruleId, ruleName}` → background resets icon/badge and calls `Analytics.recordCancel`.
- `CLOSE_TAB {ruleId, ruleName}` → background calls `Analytics.recordClose` then `chrome.tabs.remove`. Uses `return true` / `sendResponse` for async reply.

`ruleName` in these messages is the rule's **display label**, not a user-set name. Rules don't have names anymore — content.js populates `ruleName` from `rule.domainPattern` so analytics stores a meaningful per-rule key.

### Matching rules

Matches require **both** a domain glob and (optionally) a page-text check. Domain patterns are glob-with-`*` converted to regex by `globToRegex`, tested against both `hostname` and `hostname + pathname` so patterns like `*.slack.com/archives/*` and bare `*.slack.com` both work. A leading `www.` is stripped from both the rule's host and the URL's host before comparing, so `www.google.com/*` also matches `google.com` and vice versa (but arbitrary subdomains are untouched — `google.com/*` still won't match `mail.google.com`). Text mode is `substring` (case-insensitive) or `regex`. The domain+text combo is the safety interlock — it prevents wiping real app tabs.

### Storage layout

- `chrome.storage.sync`: `rules` (user rules, synced across profile), `theme` (`system`/`light`/`dark`/`garbage`).
- `chrome.storage.local`: `analytics` (lifetime counters, per-rule/per-domain stats, hourly/daily histograms, recent-closes ring buffer capped at `RECENT_LIMIT = 100`). Writes are serialized through a promise chain in `analytics.js` to prevent read-modify-write races.

### Favicon resolution (options/popup)

`setFavicon` tries Chrome's internal `_favicon/` cache first (requires the `favicon` permission, which is already in the manifest), then falls back to `https://www.google.com/s2/favicons` — but only after fingerprinting the returned image against a probe of a known-invalid domain, because Chrome returns a generic placeholder for unvisited domains. This is the **only** external network request Oscar ever makes and the privacy policy calls it out.

## House rules

- **No telemetry.** Do not add code that phones home or identifies the user. This is a hard project rule.
- **Version + changelog on every change.** Bump `"version"` in `manifest.json` (and `package.json` to match) and add a `[Unreleased]` line to `CHANGELOG.md`. CI enforces the version bump via `scripts/check-version-bump.sh` — any push to `main` (or PR targeting it) that reuses the base-commit version fails the `test` job. The build script embeds the manifest version into the zip filename.
- **Avoid `innerHTML` for user-facing content.** Use the `el()` helper in `options.js` or `document.createElement` directly.
- **2-space indent, semicolons, `const`/`let` only.**

## CI

`.github/workflows/test.yml` has two jobs:

- **`test`** — runs on PRs and pushes: `npm test` + `check-version-bump.sh`. Required status check for branch protection on `main`.
- **`build`** — runs only on push to `main` after `test` passes. Runs `scripts/build.sh` and uploads `dist/oscar-<version>.zip` as a workflow artifact named `oscar-<version>` (90-day retention). Download from the Actions tab to upload to the Chrome Web Store.

Branch protection on `main`: PR + 1 approval required, `test` status check required, force pushes + deletions blocked, admin bypass on (owner can push directly when needed).
