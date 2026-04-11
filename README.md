<div align="center">
  <img src="icons/icon-128.png" alt="Oscar" width="96" height="96">
  <h1>Oscar &mdash; Tab Auto-Closer</h1>
  <p><em>Auto-close the landing-page tabs that open desktop apps.</em></p>
</div>

Oscar watches for the "we've opened this in the desktop app" landing pages that Slack, Zoom, Microsoft Teams, and similar apps leave behind after firing their deep links. It closes those tabs for you automatically, with a live countdown, a Cancel button, and per-tab visual feedback.

It is completely local. No accounts, no telemetry, no servers.

## Features

* **Domain + page-text rules** &mdash; closes a tab only when both the URL and the rendered page text match, so you can't accidentally wipe a real Slack conversation
* **Live countdown toast** &mdash; injected into the page so you see what's happening even if the toolbar icon isn't pinned
* **Icon swap + badge** &mdash; Oscar's toolbar icon turns red and shows a countdown badge for matched tabs
* **Rule library** &mdash; one-click presets for Slack, Zoom, Teams, Webex, Discord, Figma, Linear, Notion, Spotify, GoTo Meeting
* **Smart favicons** &mdash; pulls from Chrome's local favicon cache first, falls back to Google's public service for unvisited domains
* **Four themes** &mdash; System, Light, Dark, and Garbage (Comic Sans and Papyrus, for the committed)
* **Usage analytics** &mdash; lifetime counts, time-of-day patterns, top domains, cancel rate, streaks. All stored on-device.
* **Cancel button** &mdash; change your mind mid-countdown and the tab stays open

## Install

### From the Chrome Web Store

*Coming soon.*

### From source (developer mode)

1. Clone this repo or download the latest source
2. Open `chrome://extensions` in Chrome
3. Toggle **Developer mode** on (top-right)
4. Click **Load unpacked** and pick the project folder
5. Oscar appears in your extensions; pin it from the puzzle-piece menu if you want the toolbar icon

## Usage

Open the options page from `chrome://extensions` &rarr; Oscar &rarr; **Extension options**, or right-click the toolbar icon &rarr; **Options**. Add a rule by clicking **+ Add** on any preset in the **Rule library**, or build one by hand:

* **Domain pattern** &mdash; matches against `hostname` or `hostname + pathname`. Use `*` as a wildcard. Examples: `*.slack.com/archives/*`, `zoom.us/j/*`, `meet.google.com/*`. A leading `www.` is ignored on both sides, so `www.google.com/*` also matches `google.com`, and `argusleader.com/*` also matches `www.argusleader.com`.
* **Text pattern** &mdash; case-insensitive substring (or regex) that must appear on the rendered page before Oscar fires. Leave blank to match any page on the domain.
* **Delay (s)** &mdash; how long Oscar waits after matching before closing, giving the page's deep-link handler time to fire the `slack://`, `zoommtg://`, etc. protocol.

## Privacy

Oscar does not collect, transmit, or share any personal information. See [PRIVACY.md](PRIVACY.md) for the full policy.

The only external request Oscar ever makes is to Google's public favicon service (`https://www.google.com/s2/favicons`), and only for library-preset domains you have not visited in this browser profile.

## Development

The extension is vanilla JavaScript with no build step. Edit the source, reload the extension at `chrome://extensions`, and you're done.

### File layout

```
manifest.json           Chrome extension manifest (v3)
background.js           Service worker: messaging, icon/badge state, analytics wiring
content.js              Page content script: in-page toast, Cancel button, match loop
matching.js             Shared domain/text matching helpers (content + unit tests)
action-presenter.js     Pure helpers that drive the toolbar icon / badge / title
analytics.js            Shared analytics module (background + options page)
theme.js                Shared theme resolution (System/Light/Dark/Garbage)
theme.css               CSS custom properties per theme
options.html/js/css     Settings UI: rules, library, theme picker, stats
popup.html/js/css       Toolbar popup: current-tab add button, mini stats teaser
icons/                  Shipped PNGs in 16/32/48/128 + "closing" red variants
design/                 Pre-resize icon source masters (not shipped)
scripts/build.sh        Package the extension as a zip for the Chrome Web Store
scripts/check-version-bump.sh  CI guard that requires manifest.json version bumps
test/                   node:test unit tests + dev preview HTML pages
.github/workflows/      Test + build CI
```

### Packaging for the Chrome Web Store

```bash
npm run build          # or: bash scripts/build.sh
```

Produces `dist/oscar-<version>.zip`, ready to upload to the developer dashboard.

CI also builds the zip on every push to `main` and uploads it as a workflow artifact named `oscar-<version>` (90-day retention), so you can grab a ready-to-upload zip directly from the Actions tab without running the script locally.

### Tests

```bash
npm test               # runs test/**/*.test.js via node:test (Node 21+)
```

## Contributing

Contributions welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

Oscar is released under the [MIT License](LICENSE). Do whatever you want with it.
