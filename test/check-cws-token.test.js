'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { diagnose, missingEnv } = require(path.join(__dirname, '..', 'scripts', 'check-cws-token.js'));

describe('check-cws-token missingEnv', () => {
  test('reports nothing when all three secrets are set', () => {
    assert.deepEqual(missingEnv({ CLIENT_ID: 'a', CLIENT_SECRET: 'b', REFRESH_TOKEN: 'c' }), []);
  });

  test('lists every unset or empty secret', () => {
    assert.deepEqual(missingEnv({ CLIENT_ID: 'a', CLIENT_SECRET: '' }), [
      'CLIENT_SECRET',
      'REFRESH_TOKEN',
    ]);
  });
});

describe('check-cws-token diagnose', () => {
  test('succeeds only when an access token was issued', () => {
    const r = diagnose(200, { access_token: 'ya29.secret', expires_in: 3599 });
    assert.equal(r.ok, true);
    assert.ok(!r.message.includes('ya29.secret'), 'must never echo the access token');
  });

  test('a 200 without an access token is still a failure', () => {
    assert.equal(diagnose(200, {}).ok, false);
  });

  test('invalid_grant explains the 7-day Testing-mode expiry and how to recover', () => {
    const r = diagnose(400, { error: 'invalid_grant', error_description: 'Bad Request' });
    assert.equal(r.ok, false);
    assert.match(r.message, /invalid_grant: Bad Request/);
    assert.match(r.message, /Testing/);
    assert.match(r.message, /7 days/);
    assert.match(r.message, /REFRESH_TOKEN repository secret/);
    assert.match(r.message, /Re-run all jobs/);
    assert.match(r.message, /RELEASING\.md/);
  });

  test('invalid_client points at the client id/secret pairing', () => {
    const r = diagnose(401, { error: 'invalid_client', error_description: 'Unauthorized' });
    assert.equal(r.ok, false);
    assert.match(r.message, /CLIENT_ID \/ CLIENT_SECRET/);
    assert.match(r.message, /same client/);
  });

  test('unknown errors fall back to a generic message with the status', () => {
    const r = diagnose(500, null);
    assert.equal(r.ok, false);
    assert.match(r.message, /HTTP 500/);
    assert.match(r.message, /RELEASING\.md/);
  });

  test('does not throw on a non-object body', () => {
    assert.equal(diagnose(400, 'not json').ok, false);
  });
});
