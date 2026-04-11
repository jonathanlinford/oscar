importScripts('analytics.js', 'action-presenter.js');
const Analytics = self.OscarAnalytics;
const { markTabClosing, resetTab } = self.OscarActionPresenter;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg !== 'object') return;
  const tabId = sender.tab && sender.tab.id;
  if (tabId == null) return;

  if (msg.type === 'MATCH_PENDING') {
    console.log(`Oscar: matched "${msg.ruleName}" on ${sender.tab.url}`);
    markTabClosing(chrome.action, tabId, msg.ruleName);
    return;
  }

  if (msg.type === 'MATCH_TICK') {
    const text = msg.seconds > 0 ? String(msg.seconds) : '';
    chrome.action.setBadgeText({ tabId, text }).catch(() => {});
    return;
  }

  if (msg.type === 'CANCEL_MATCH') {
    console.log('Oscar: cancelled by user');
    resetTab(chrome.action, tabId);
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
