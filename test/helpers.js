'use strict';

// Loads the extension source files directly via require() so node:test's
// coverage tool can instrument them. The files use a dual export pattern
// (IIFE that attaches to self/window AND sets module.exports), so they work
// in both the browser and Node — we just need to stub `self`, `window`, and
// `chrome` on globalThis before the require.

const path = require('node:path');

const chromeStub = {
  _store: { sync: {}, local: {} },
  _listeners: [],
  resetStore() {
    this._store.sync = {};
    this._store.local = {};
  },
};

function makeArea(name) {
  return {
    async get(key) {
      const store = chromeStub._store[name];
      if (key == null) return { ...store };
      if (Array.isArray(key)) {
        const out = {};
        for (const k of key) out[k] = store[k];
        return out;
      }
      if (typeof key === 'string') return { [key]: store[key] };
      const out = {};
      for (const [k, def] of Object.entries(key)) {
        out[k] = store[k] !== undefined ? store[k] : def;
      }
      return out;
    },
    async set(obj) {
      const store = chromeStub._store[name];
      const changes = {};
      for (const [k, v] of Object.entries(obj)) {
        changes[k] = { oldValue: store[k], newValue: v };
        store[k] = v;
      }
      for (const fn of chromeStub._listeners) fn(changes, name);
    },
  };
}

chromeStub.storage = {
  sync: makeArea('sync'),
  local: makeArea('local'),
  onChanged: { addListener: (fn) => chromeStub._listeners.push(fn) },
};

// Shim globals before loading the source files so their IIFE-attached
// `self.Oscar*` assignments land somewhere sensible.
globalThis.self = globalThis;
globalThis.window = globalThis;
globalThis.chrome = chromeStub;

const matchingPath = path.join(__dirname, '..', 'matching.js');
const analyticsPath = path.join(__dirname, '..', 'analytics.js');

// matching.js sets module.exports at the bottom of its IIFE — we can just
// take the returned value.
const OscarMatching = require(matchingPath);

// analytics.js only exports via globalThis. Requiring it runs the IIFE
// which attaches to globalThis.OscarAnalytics.
require(analyticsPath);
const OscarAnalytics = globalThis.OscarAnalytics;

// Reset helper: call at the start of each test that touches analytics state
// so tests don't leak into each other. analytics.js has a single module-level
// promise chain + whatever the stub store holds, so we clear both.
async function resetAnalyticsState() {
  chromeStub.resetStore();
  await OscarAnalytics.reset();
  chromeStub.resetStore();
}

module.exports = {
  OscarMatching,
  OscarAnalytics,
  chromeStub,
  resetAnalyticsState,
};
