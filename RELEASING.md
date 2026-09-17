# Releasing Oscar

How a version gets from `main` to the Chrome Web Store, and how to recover when the automated publish fails.

## Normal release

1. Land the change on `main` with the version bumped in **both** `manifest.json` and `package.json`, and a `CHANGELOG.md` entry under `[Unreleased]`. CI (`scripts/check-version-bump.sh`) refuses merges that reuse the base version.
2. Tag the merge commit and push the tag:

   ```bash
   git tag v0.1.23
   git push origin v0.1.23
   ```

3. The `release` workflow (`.github/workflows/release.yml`) then:
   * verifies the tag matches `manifest.json`;
   * checks the Web Store credentials (`scripts/check-cws-token.js`) and fails fast with a diagnosis if they are missing or expired;
   * runs `npm test` and `scripts/build.sh`;
   * uploads `dist/oscar-<version>.zip` with `chrome-webstore-upload-cli` and submits it for review.

4. Google reviews the submission (usually hours to a few days). Watch the [developer dashboard](https://chrome.google.com/webstore/devconsole) for the outcome.

A version number can only be uploaded to the Web Store once. If a tagged version fails to publish and you have to change code, bump the version and tag again rather than reusing the number.

## Credentials

The workflow uses three repository secrets, all tied to one OAuth client (`oscar-cws-publish`) in the Google Cloud project that owns the Web Store developer account:

| Secret | What it is |
| --- | --- |
| `CLIENT_ID` | OAuth 2.0 client ID (Desktop app type) |
| `CLIENT_SECRET` | Its client secret |
| `REFRESH_TOKEN` | A refresh token minted for that client with the `https://www.googleapis.com/auth/chromewebstore` scope |

The extension ID (`pmnlpaaoigckgocmndipekjbiplkjbea`) is public and is hardcoded in the workflow.

### Minting a refresh token

Follow the [chrome-webstore-upload-keys](https://github.com/fregante/chrome-webstore-upload-keys) guide. In short:

1. In Google Cloud, enable the **Chrome Web Store API** for the project.
2. On **APIs & Services → OAuth consent screen**, set the publishing status to **In production**. While it is **Testing**, every refresh token Google issues expires after **7 days**, which is the usual reason CI fails with `invalid_grant`. The app does not need to go through verification for the owner's own account to use it.
3. Create (or reuse) an OAuth client of type **Desktop app**. Note the client ID and secret.
4. Run the key helper and complete the consent flow in the browser as the Web Store developer account:

   ```bash
   npx chrome-webstore-upload-keys
   ```

   It prints the client ID, client secret, and a refresh token.

5. Validate the three values locally before saving them, so a bad paste doesn't cost a release:

   ```bash
   CLIENT_ID=... CLIENT_SECRET=... REFRESH_TOKEN=... node scripts/check-cws-token.js
   ```

6. Save them as repository secrets under **Settings → Secrets and variables → Actions**.

## When the publish step fails

### `invalid_grant` (expired or revoked refresh token)

The pre-flight step reports this as *"Google rejected REFRESH_TOKEN"*. Causes, most likely first:

* The OAuth consent screen is in **Testing** status, so the token expired 7 days after it was minted. Set it to **In production** (step 2 above).
* The token was revoked (the developer account removed the app's access, the client was deleted or recreated, or the account's security settings changed).
* The token was minted for a different client than the one `CLIENT_ID` / `CLIENT_SECRET` point at.
* Google's per-client limit on outstanding refresh tokens was exceeded, invalidating the oldest ones.

Fix: mint a new token (above), update `REFRESH_TOKEN` (and, if the client changed, the other two secrets), then **re-run the failed workflow run** from the Actions tab. Re-runs read the current secrets and use the same tag, so no new tag or version bump is needed.

You can also start the workflow by hand: **Actions → release → Run workflow**, pick the `v<version>` tag, and leave *Submit for review* checked. Unchecking it uploads the zip as a draft so you can submit it from the developer dashboard yourself.

### `invalid_client`

`CLIENT_ID` or `CLIENT_SECRET` is wrong, or the OAuth client was deleted. Recreate the client, mint a new token for it, and update all three secrets.

### Missing secrets

The pre-flight step lists which of the three are unset. Add them and re-run.

### Upload succeeded but publish failed

The item is in the dashboard as a draft. Common reasons: the previous version is still under review, or the listing needs an updated privacy disclosure for a new permission. Resolve it in the dashboard and either submit there or re-run the workflow with *Submit for review* checked.

## Manual fallback

If CI is unavailable, build and upload by hand:

```bash
npm test
npm run build            # dist/oscar-<version>.zip
```

Then drag the zip into the developer dashboard. The `build` job on `main` also publishes a ready-to-upload artifact named `oscar-<version>` on every push.

## Maintenance notes

* `chrome-webstore-upload-cli` is pinned to an exact version in `release.yml` because that process holds the publishing credentials; bump it deliberately after reading its changelog rather than letting `npx` float.
* GitHub masks the secret values in logs, but never run the upload CLI locally with shell tracing (`set -x`) or paste its error output anywhere public: on some failures it echoes the refresh token it was given.
* Nothing in this repo can make Google mark the extension as trusted for Enhanced Safe Browsing users. Google grants that on developer reputation and policy compliance, typically after a few months for new developers. Keeping permissions minimal, the privacy policy accurate, and releases clean is what helps.
