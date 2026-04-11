# Oscar Privacy Policy

**Effective:** April 2026

Oscar is designed to work entirely on your device. It does not collect, transmit, or share any personal information with the Oscar maintainers or any third party.

## What Oscar stores locally

* **Rules** (`chrome.storage.sync`) &mdash; the domain patterns, text patterns, and delay settings you configure. Synced across your Chrome profile's devices if you have Chrome Sync enabled. Not transmitted to any Oscar-operated server.
* **Theme preference** (`chrome.storage.sync`) &mdash; your chosen appearance (System, Light, Dark, or Garbage).
* **Usage analytics** (`chrome.storage.local`) &mdash; device-local counts of tabs closed, per-rule stats, per-domain stats, time-of-day histograms, and a capped ring buffer of recently closed URLs. This data never leaves your device.

You can reset the analytics at any time from the **Stats** section of the Oscar options page. Uninstalling the extension wipes everything.

## What Oscar does NOT do

* No telemetry, crash reporting, or usage reporting to any remote service
* No third-party analytics SDKs
* No account or sign-in required
* No ads or tracking scripts
* No cross-site user identification

## Page content access

Oscar's content script runs on all pages (`<all_urls>` host permission) so it can check whether the rendered page text matches any of your rules. It reads `document.body.innerText` locally in the browser, compares it against your configured patterns, and discards the result. The page content is never persisted, logged, or transmitted.

## Network requests

The only external HTTP request Oscar ever makes is to Google's public favicon service:

```
https://www.google.com/s2/favicons?domain=<host>&sz=32
```

This request happens only on the Oscar options page, only for domains that are not already cached in Chrome's local favicon store (which Oscar checks first). It sends the domain name in the URL so Google can return the favicon image &mdash; nothing else is transmitted. If you want to avoid even this request, use only rules for domains you have already visited in this Chrome profile.

## Permissions explained

| Permission | Why Oscar needs it |
| --- | --- |
| `storage` | Save your rules, theme, and local analytics |
| `tabs` | Close the tab that matched a rule |
| `favicon` | Display site favicons from Chrome's local cache on the options page |
| `<all_urls>` (host) | Run the content script on any page where a rule might apply |

## Source code

Oscar is open source under the MIT License. Read the full source, file issues, or submit pull requests at:

**https://github.com/jonathanlinford/oscar**

## Contact

For questions about this privacy policy, open an issue on the GitHub repository.
