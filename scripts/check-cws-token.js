#!/usr/bin/env node
'use strict';
//
// Pre-flight check for the Chrome Web Store publish credentials.
//
// Exchanges REFRESH_TOKEN for an access token against Google's OAuth endpoint
// and exits non-zero with an actionable diagnosis if that fails. The release
// workflow runs this before building so an expired or revoked token fails in
// seconds with instructions, instead of surfacing as a bare `invalid_grant`
// from the upload CLI after tests and packaging.
//
// Also useful locally to validate freshly minted credentials before saving
// them as repository secrets:
//
//   CLIENT_ID=... CLIENT_SECRET=... REFRESH_TOKEN=... node scripts/check-cws-token.js
//
// This script never prints the secrets or the issued access token. It is a
// dev/CI tool only — it is not in scripts/build.sh and does not ship.

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REQUIRED = ['CLIENT_ID', 'CLIENT_SECRET', 'REFRESH_TOKEN'];
const RERUN =
  'Then re-run the failed workflow run (Actions → the run → "Re-run all jobs"); ' +
  'a re-run picks up updated secrets and does not need a new tag.';

function missingEnv(env) {
  return REQUIRED.filter((key) => !env[key]);
}

// Map an OAuth token response to { ok, message }. `body` is the parsed JSON
// response (or null if it wasn't JSON). Only `error` / `error_description`
// are ever echoed — never the access token.
function diagnose(status, body) {
  const b = body && typeof body === 'object' ? body : {};
  if (status >= 200 && status < 300 && typeof b.access_token === 'string') {
    return { ok: true, message: 'Chrome Web Store credentials OK — access token issued.' };
  }

  const detail = [b.error, b.error_description].filter(Boolean).join(': ');
  const suffix = detail ? ` (${detail})` : ` (HTTP ${status})`;

  switch (b.error) {
    case 'invalid_grant':
      return {
        ok: false,
        message:
          `Google rejected REFRESH_TOKEN${suffix}. The token is expired or revoked. ` +
          'Most common cause: the Google Cloud OAuth consent screen is in "Testing" publishing ' +
          'status, which expires refresh tokens after 7 days. Set it to "In production", mint a ' +
          'new refresh token (see RELEASING.md), and update the REFRESH_TOKEN repository secret. ' +
          RERUN,
      };
    case 'invalid_client':
    case 'unauthorized_client':
      return {
        ok: false,
        message:
          `Google rejected the OAuth client${suffix}. CLIENT_ID / CLIENT_SECRET do not match a ` +
          'valid OAuth client in the Google Cloud project, or REFRESH_TOKEN was minted for a ' +
          'different client. Check all three secrets against the same client (see RELEASING.md). ' +
          RERUN,
      };
    default:
      return {
        ok: false,
        message: `Token exchange with ${TOKEN_URL} failed${suffix}. See RELEASING.md. ${RERUN}`,
      };
  }
}

function report(ok, message) {
  if (ok) {
    console.log(message);
    return;
  }
  // GitHub Actions renders `::error::` as an annotation on the run summary.
  const prefix = process.env.GITHUB_ACTIONS ? '::error::' : 'error: ';
  console.error(prefix + message);
}

async function main() {
  const missing = missingEnv(process.env);
  if (missing.length) {
    report(
      false,
      `Missing ${missing.join(', ')}. Set them as repository secrets (or in the environment ` +
        'when running locally). See RELEASING.md.',
    );
    process.exit(1);
  }

  const params = new URLSearchParams({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    refresh_token: process.env.REFRESH_TOKEN,
    grant_type: 'refresh_token',
  });

  let res;
  try {
    res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
  } catch (err) {
    report(false, `Could not reach ${TOKEN_URL}: ${err && err.message ? err.message : err}`);
    process.exit(1);
  }

  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  const { ok, message } = diagnose(res.status, body);
  report(ok, message);
  process.exit(ok ? 0 : 1);
}

if (require.main === module) {
  main();
} else {
  module.exports = { diagnose, missingEnv, TOKEN_URL, REQUIRED };
}
