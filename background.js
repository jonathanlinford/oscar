importScripts('analytics.js');
const Analytics = self.OscarAnalytics;

const DEFAULT_ICONS = {
  16: 'icons/icon-16.png',
  32: 'icons/icon-32.png',
  48: 'icons/icon-48.png',
  128: 'icons/icon-128.png',
};

const CLOSING_ICONS = {
  16: 'icons/icon-closing-16.png',
  32: 'icons/icon-closing-32.png',
  48: 'icons/icon-closing-48.png',
  128: 'icons/icon-closing-128.png',
};

const DEFAULT_RULES = [
  {
    name: 'Slack deep link',
    domainPattern: '*.slack.com/archives/*',
    textPattern: 'redirected you to the desktop app',
    textMode: 'substring',
    delayMs: 2000,
    enabled: true,
  },
  {
    name: 'Zoom launch meeting',
    domainPattern: '*.zoom.us/*',
    textPattern: 'Click Open Zoom Meetings',
    textMode: 'substring',
    delayMs: 2500,
    enabled: true,
  },
];

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason !== 'install') return;
  const { rules } = await chrome.storage.sync.get('rules');
  if (rules && rules.length) return;
  const seeded = DEFAULT_RULES.map((r) => ({ id: crypto.randomUUID(), ...r }));
  await chrome.storage.sync.set({ rules: seeded });
});

function markTabClosing(tabId, ruleName) {
  chrome.action.setIcon({ tabId, path: CLOSING_ICONS }).catch(() => {});
  chrome.action.setBadgeBackgroundColor({ tabId, color: '#dc2626' }).catch(() => {});
  chrome.action.setTitle({ tabId, text: `Oscar: closing — ${ruleName}` }).catch(() => {});
}

function resetTab(tabId) {
  chrome.action.setIcon({ tabId, path: DEFAULT_ICONS }).catch(() => {});
  chrome.action.setBadgeText({ tabId, text: '' }).catch(() => {});
  chrome.action.setTitle({ tabId, text: 'Oscar' }).catch(() => {});
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg !== 'object') return;
  const tabId = sender.tab && sender.tab.id;
  if (tabId == null) return;

  if (msg.type === 'MATCH_PENDING') {
    console.log(`Oscar: matched "${msg.ruleName}" on ${sender.tab.url}`);
    markTabClosing(tabId, msg.ruleName);
    return;
  }

  if (msg.type === 'MATCH_TICK') {
    const text = msg.seconds > 0 ? String(msg.seconds) : '';
    chrome.action.setBadgeText({ tabId, text }).catch(() => {});
    return;
  }

  if (msg.type === 'CANCEL_MATCH') {
    console.log('Oscar: cancelled by user');
    resetTab(tabId);
    Analytics.recordCancel({ ruleId: msg.ruleId, ruleName: msg.ruleName });
    return;
  }

  if (msg.type === 'CLOSE_TAB') {
    Analytics.recordClose({
      url: sender.tab.url,
      ruleId: msg.ruleId,
      ruleName: msg.ruleName,
      delayMs: msg.delayMs,
    });
    chrome.tabs
      .remove(tabId)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => {
        console.warn('Oscar: close failed', err);
        sendResponse({ ok: false, error: String(err) });
      });
    return true;
  }
});
