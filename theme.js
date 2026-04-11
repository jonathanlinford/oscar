(() => {
  const STORAGE_KEY = 'theme';
  const VALID_THEMES = ['system', 'light', 'dark', 'garbage'];

  function resolve(theme) {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  }

  function apply(theme) {
    const safe = VALID_THEMES.includes(theme) ? theme : 'system';
    document.documentElement.dataset.themeSetting = safe;
    document.documentElement.dataset.theme = resolve(safe);
  }

  async function init() {
    try {
      const { [STORAGE_KEY]: stored } = await chrome.storage.sync.get(STORAGE_KEY);
      apply(stored || 'system');
    } catch {
      apply('system');
    }

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', async () => {
      const { [STORAGE_KEY]: stored } = await chrome.storage.sync.get(STORAGE_KEY);
      if (!stored || stored === 'system') apply('system');
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync' || !changes[STORAGE_KEY]) return;
      apply(changes[STORAGE_KEY].newValue || 'system');
    });
  }

  window.OscarTheme = {
    STORAGE_KEY,
    VALID_THEMES,
    apply,
    async set(theme) {
      if (!VALID_THEMES.includes(theme)) return;
      await chrome.storage.sync.set({ [STORAGE_KEY]: theme });
    },
    async get() {
      const { [STORAGE_KEY]: stored } = await chrome.storage.sync.get(STORAGE_KEY);
      return stored || 'system';
    },
  };

  init();
})();
