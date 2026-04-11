# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Oscar is a Chrome Manifest V3 extension that auto-closes the landing-page tabs desktop apps leave behind after firing their deep links (Slack, Zoom, Teams, etc.). Plain vanilla JavaScript — **no bundler, no transpiler, no runtime `node_modules`**. Never introduce tooling that requires `npm install` to load the extension.

## Commands

```bash
bash scripts/build.sh   # or: npm run build — zips the extension to dist/oscar-<version>.zip
npm test                # currently a stub (`echo "no tests yet"`) despite what CONTRIBUTING.md claims
```

There is no lint step and no `test/` directory. CONTRIBUTING.md describes a testing workflow that does not yet exist — treat its `npm test` instructions as aspirational.

### Development loop

1. Load unpacked from `chrome://extensions` (Developer mode on).
2. Edit source in place.
3. Reload the extension's card after editing `background.js`, `content.js`, `manifest.json`, or shared modules. `options.html/js/css` and `popup.html/js/css` pick up on next page open. **Content-script edits also require reloading the page under test.**

### Packaging (important)

`scripts/build.sh` zips a **hardcoded file list** (`EXTENSION_FILES` + `ICON_FILES`). If you add a new source or icon file, add it to that list or it will not ship. The script reads the version from `manifest.json` and fails loudly on missing files.

## Architecture

Four JS surfaces communicate via `chrome.storage` and `chrome.runtime.sendMessage`:

- **`background.js`** — service worker. `importScripts('analytics.js')` to share analytics with the options page. Owns per-tab icon/badge state, records analytics, and executes `chrome.tabs.remove`. It does **not** drive the countdown — the content script does.
- **`content.js`** — IIFE content script, `run_at: document_idle`. Loads rules from `chrome.storage.sync`, matches against `location.href` + `document.body.innerText`, and on match creates a Shadow-DOM overlay toast with the countdown and Cancel button. Re-checks via a `MutationObserver` for up to `OBSERVER_TIMEOUT_MS` (15s) to catch late-rendered page text. `queuedRuleId` guards against double-matching.
- **`options.js` / `options.html`** — rules table, rule library, theme picker, stats dashboard. Reads `OscarAnalytics` and `OscarTheme` off `window`.
- **`popup.js` / `popup.html`** — toolbar popup: "add rule from current tab" button + mini stats teaser.

### Shared modules (IIFE + global pattern)

`analytics.js` and `theme.js` are deliberately plain IIFEs that attach their API to `self.OscarAnalytics` / `window.OscarTheme`. This is the only way to share code between the service worker (via `importScripts`) and regular pages (via `<script>`) without a build step. **Do not convert these to ES modules** — MV3 service workers + `importScripts` do not play well with `type=module`, and introducing a bundler is explicitly rejected in CONTRIBUTING.md.

### Message protocol (content → background)

- `MATCH_PENDING {ruleId, ruleName, delayMs}` → background sets the red "closing" icon + tooltip.
- `MATCH_TICK {seconds}` → background updates the badge text.
- `CANCEL_MATCH {ruleId, ruleName}` → background resets icon/badge and calls `Analytics.recordCancel`.
- `CLOSE_TAB {ruleId, ruleName}` → background calls `Analytics.recordClose` then `chrome.tabs.remove`. Uses `return true` / `sendResponse` for async reply.

### Matching rules

Matches require **both** a domain glob and (optionally) a page-text check. Domain patterns are glob-with-`*` converted to regex by `globToRegex`, tested against both `hostname` and `hostname + pathname` so patterns like `*.slack.com/archives/*` and bare `*.slack.com` both work. Text mode is `substring` (case-insensitive) or `regex`. The domain+text combo is the safety interlock — it prevents wiping real app tabs.

### Storage layout

- `chrome.storage.sync`: `rules` (user rules, synced across profile), `theme` (`system`/`light`/`dark`/`garbage`).
- `chrome.storage.local`: `analytics` (lifetime counters, per-rule/per-domain stats, hourly/daily histograms, recent-closes ring buffer capped at `RECENT_LIMIT = 100`). Writes are serialized through a promise chain in `analytics.js` to prevent read-modify-write races.

### Favicon resolution (options/popup)

`setFavicon` tries Chrome's internal `_favicon/` cache first (requires the `favicon` permission, which is already in the manifest), then falls back to `https://www.google.com/s2/favicons` — but only after fingerprinting the returned image against a probe of a known-invalid domain, because Chrome returns a generic placeholder for unvisited domains. This is the **only** external network request Oscar ever makes and the privacy policy calls it out.

## House rules

- **No telemetry.** Do not add code that phones home or identifies the user. This is a hard project rule.
- **Version + changelog on every change.** Bump `"version"` in `manifest.json` and add a `[Unreleased]` line to `CHANGELOG.md`. The build script embeds the manifest version into the zip filename.
- **Avoid `innerHTML` for user-facing content.** Use the `el()` helper in `options.js` or `document.createElement` directly.
- **2-space indent, semicolons, `const`/`let` only.**
