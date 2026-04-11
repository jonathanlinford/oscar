(() => {
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

  const CLOSING_BADGE_COLOR = '#dc2626';

  function markTabClosing(action, tabId, ruleName) {
    action.setIcon({ tabId, path: CLOSING_ICONS }).catch(() => {});
    action.setBadgeBackgroundColor({ tabId, color: CLOSING_BADGE_COLOR }).catch(() => {});
    action.setTitle({ tabId, title: `Oscar: closing — ${ruleName}` }).catch(() => {});
  }

  function resetTab(action, tabId) {
    action.setIcon({ tabId, path: DEFAULT_ICONS }).catch(() => {});
    action.setBadgeText({ tabId, text: '' }).catch(() => {});
    action.setTitle({ tabId, title: 'Oscar' }).catch(() => {});
  }

  const api = {
    DEFAULT_ICONS,
    CLOSING_ICONS,
    CLOSING_BADGE_COLOR,
    markTabClosing,
    resetTab,
  };

  if (typeof self !== 'undefined') self.OscarActionPresenter = api;
  if (typeof window !== 'undefined') window.OscarActionPresenter = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
