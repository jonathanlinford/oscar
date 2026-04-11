'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { OscarMatching } = require('./helpers');

const { globToRegex, hostMatches, textMatches } = OscarMatching;

describe('globToRegex', () => {
  test('escapes regex metacharacters in the literal parts', () => {
    const re = globToRegex('example.com/foo+bar');
    assert.ok(re.test('example.com/foo+bar'));
    assert.ok(!re.test('exampleXcom/foo+bar'), 'dot should be literal, not match any char');
  });

  test('* becomes .*', () => {
    const re = globToRegex('*.slack.com/archives/*');
    assert.ok(re.test('app.slack.com/archives/C123'));
    assert.ok(re.test('team.slack.com/archives/'));
  });

  test('is case-insensitive', () => {
    const re = globToRegex('example.com');
    assert.ok(re.test('EXAMPLE.COM'));
  });

  test('anchors both ends', () => {
    const re = globToRegex('slack.com');
    assert.ok(re.test('slack.com'));
    assert.ok(!re.test('slack.com/extra'));
    assert.ok(!re.test('prefix-slack.com'));
  });
});

describe('hostMatches', () => {
  test('matches hostname + pathname when pattern has a path', () => {
    assert.ok(hostMatches('*.slack.com/archives/*', 'https://app.slack.com/archives/C123'));
  });

  test('matches bare hostname when pattern is hostname-only', () => {
    assert.ok(hostMatches('*.slack.com', 'https://app.slack.com/client/T0'));
  });

  test('rejects unrelated domains', () => {
    assert.ok(!hostMatches('*.slack.com/*', 'https://example.com/foo'));
  });

  test('returns false on malformed URLs', () => {
    assert.ok(!hostMatches('*.slack.com/*', 'not-a-url'));
  });

  test('returns false on empty pattern', () => {
    assert.ok(!hostMatches('', 'https://slack.com'));
  });

  test('handles the zoom preset pattern', () => {
    assert.ok(hostMatches('*.zoom.us/j/*', 'https://us02web.zoom.us/j/1234567890'));
    assert.ok(!hostMatches('*.zoom.us/j/*', 'https://zoom.us/signin'));
  });

  test('handles the google meet pattern', () => {
    assert.ok(hostMatches('meet.google.com/*', 'https://meet.google.com/abc-defg-hij'));
  });

  test('ignores leading www. on the pattern', () => {
    // Rule typed as `www.google.com/*` should match bare-hostname URLs too.
    assert.ok(hostMatches('www.google.com/*', 'https://google.com/search'));
    assert.ok(hostMatches('www.google.com/*', 'https://www.google.com/search'));
  });

  test('ignores leading www. on the URL', () => {
    // Rule typed without www should match URLs that have www.
    assert.ok(hostMatches('argusleader.com/*', 'https://www.argusleader.com/news'));
    assert.ok(hostMatches('argusleader.com/*', 'https://argusleader.com/news'));
  });

  test('www-stripping applies to hostname-only patterns', () => {
    assert.ok(hostMatches('www.example.com', 'https://example.com/'));
    assert.ok(hostMatches('example.com', 'https://www.example.com/'));
  });

  test('www-stripping does not cross subdomains', () => {
    // Only the literal `www.` prefix is stripped — not arbitrary subdomains.
    assert.ok(!hostMatches('google.com/*', 'https://mail.google.com/inbox'));
  });
});

describe('textMatches', () => {
  test('empty pattern matches anything', () => {
    assert.ok(textMatches('', 'substring', 'whatever'));
    assert.ok(textMatches(null, 'regex', 'whatever'));
    assert.ok(textMatches(undefined, 'substring', ''));
  });

  test('substring mode is case-insensitive', () => {
    assert.ok(textMatches('OPEN Zoom', 'substring', 'click open zoom meetings'));
  });

  test('substring mode requires actual containment', () => {
    assert.ok(!textMatches('zoom desktop', 'substring', 'open zoom meetings'));
  });

  test('regex mode uses the pattern as a regex', () => {
    assert.ok(textMatches('open\\s+\\w+', 'regex', 'open zoom'));
    assert.ok(!textMatches('^launched$', 'regex', 'launched app'));
  });

  test('regex mode is case-insensitive', () => {
    assert.ok(textMatches('OPEN', 'regex', 'click open here'));
  });

  test('invalid regex returns false rather than throwing', () => {
    assert.ok(!textMatches('(unterminated', 'regex', 'anything'));
  });

  test('defaults to substring for unknown mode', () => {
    assert.ok(textMatches('needle', 'bogus', 'the needle is here'));
  });
});
