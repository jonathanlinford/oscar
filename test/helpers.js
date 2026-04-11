'use strict';

// Load an IIFE extension source file in a fresh Node scope so its
// `self.Oscar*` global assignment lands on a fake `self`, not on our test
// process globals. Returns whatever the IIFE attached to `self`.
//
// The extension files use a dual-export pattern that checks `module.exports`
// last — but some of them (analytics.js) also reference `chrome.*` lazily
// inside functions, so the caller can pass a `chrome` shim.

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadModule(relPath, { chrome } = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  const self = {};
  const context = {
    self,
    window: self,
    chrome,
    URL,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    console,
    Promise,
    Date,
    Math,
    Object,
    Array,
    String,
    Number,
    RegExp,
    Error,
    JSON,
  };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: relPath });
  return self;
}

function makeChromeStub() {
  const store = { sync: {}, local: {} };
  const listeners = [];

  function area(name) {
    return {
      async get(key) {
        if (key == null) return { ...store[name] };
        if (Array.isArray(key)) {
          const out = {};
          for (const k of key) out[k] = store[name][k];
          return out;
        }
        if (typeof key === 'string') return { [key]: store[name][key] };
        const out = {};
        for (const [k, def] of Object.entries(key)) {
          out[k] = store[name][k] !== undefined ? store[name][k] : def;
        }
        return out;
      },
      async set(obj) {
        const changes = {};
        for (const [k, v] of Object.entries(obj)) {
          changes[k] = { oldValue: store[name][k], newValue: v };
          store[name][k] = v;
        }
        for (const fn of listeners) fn(changes, name);
      },
    };
  }

  return {
    storage: {
      sync: area('sync'),
      local: area('local'),
      onChanged: { addListener: (fn) => listeners.push(fn) },
    },
    _store: store,
  };
}

module.exports = { loadModule, makeChromeStub };
