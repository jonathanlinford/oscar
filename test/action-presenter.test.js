'use strict';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// Load the module directly — action-presenter has no side effects and uses
// the dual-export pattern.
const ActionPresenter = require(path.join(__dirname, '..', 'action-presenter.js'));
const { markTabClosing, resetTab, DEFAULT_ICONS, CLOSING_ICONS, CLOSING_BADGE_COLOR } =
  ActionPresenter;

// A strict chrome.action stub. Chrome's MV3 implementation validates the
// parameter object's keys against a per-method allow-list and throws
// synchronously when it finds an unexpected property. We reproduce that
// validation here so unit tests catch shape mismatches (like passing
// `{ text }` to setTitle when the real API wants `{ title }`).
function makeStrictAction() {
  const calls = [];

  function validate(method, allowed, details) {
    if (details == null || typeof details !== 'object') {
      throw new TypeError(
        `Error in invocation of action.${method}(object details, optional function callback): ` +
          `No matching signature.`,
      );
    }
    for (const key of Object.keys(details)) {
      if (!allowed.includes(key)) {
        throw new TypeError(
          `Error in invocation of action.${method}(object details, optional function callback): ` +
            `Error at parameter 'details': Unexpected property: '${key}'.`,
        );
      }
    }
  }

  return {
    calls,
    setIcon(details) {
      validate('setIcon', ['tabId', 'path', 'imageData'], details);
      calls.push({ method: 'setIcon', details });
      return Promise.resolve();
    },
    setBadgeText(details) {
      validate('setBadgeText', ['tabId', 'text'], details);
      calls.push({ method: 'setBadgeText', details });
      return Promise.resolve();
    },
    setBadgeBackgroundColor(details) {
      validate('setBadgeBackgroundColor', ['tabId', 'color'], details);
      calls.push({ method: 'setBadgeBackgroundColor', details });
      return Promise.resolve();
    },
    setTitle(details) {
      // Real MV3 API: { title, tabId } — NOT { text, tabId }
      validate('setTitle', ['tabId', 'title'], details);
      calls.push({ method: 'setTitle', details });
      return Promise.resolve();
    },
  };
}

describe('markTabClosing', () => {
  let action;
  beforeEach(() => {
    action = makeStrictAction();
  });

  test('sets the closing icon, red badge color, and a contextual title', () => {
    markTabClosing(action, 42, 'Slack deep link');

    const byMethod = (m) => action.calls.find((c) => c.method === m);

    const icon = byMethod('setIcon');
    assert.ok(icon, 'setIcon should have been called');
    assert.equal(icon.details.tabId, 42);
    assert.deepEqual(icon.details.path, CLOSING_ICONS);

    const color = byMethod('setBadgeBackgroundColor');
    assert.ok(color, 'setBadgeBackgroundColor should have been called');
    assert.equal(color.details.tabId, 42);
    assert.equal(color.details.color, CLOSING_BADGE_COLOR);

    const title = byMethod('setTitle');
    assert.ok(title, 'setTitle should have been called');
    assert.equal(title.details.tabId, 42);
    // The title should appear under the `title` property — this is the
    // regression test for the "Unexpected property: 'text'" runtime error
    // seen in the service worker console.
    assert.equal(
      title.details.title,
      'Oscar: closing — Slack deep link',
      'setTitle must be called with { title }, not { text } — Chrome MV3 rejects unknown keys synchronously',
    );
  });

  test('does not throw when the action API validates parameter shapes strictly', () => {
    // If markTabClosing passes an unknown key to any setter, the strict
    // stub throws synchronously and this test fails — reproducing exactly
    // the runtime error that showed up in the extension error log.
    assert.doesNotThrow(() => {
      markTabClosing(action, 1, 'Test rule');
    });
  });
});

describe('resetTab', () => {
  let action;
  beforeEach(() => {
    action = makeStrictAction();
  });

  test('restores the default icon, clears the badge text, and resets the title', () => {
    resetTab(action, 7);

    const byMethod = (m) => action.calls.find((c) => c.method === m);

    const icon = byMethod('setIcon');
    assert.ok(icon);
    assert.equal(icon.details.tabId, 7);
    assert.deepEqual(icon.details.path, DEFAULT_ICONS);

    const badge = byMethod('setBadgeText');
    assert.ok(badge);
    assert.equal(badge.details.tabId, 7);
    // setBadgeText DOES use `text` — that's the correct shape for this method
    assert.equal(badge.details.text, '');

    const title = byMethod('setTitle');
    assert.ok(title);
    assert.equal(title.details.tabId, 7);
    // ...but setTitle uses `title`, not `text`
    assert.equal(title.details.title, 'Oscar');
  });

  test('does not throw under strict action-API validation', () => {
    assert.doesNotThrow(() => {
      resetTab(action, 1);
    });
  });
});
