(() => {
  const DEFAULT_DELAY_MS = 2000;
  const OBSERVER_TIMEOUT_MS = 15000;
  const TICK_INTERVAL_MS = 250;

  const { hostMatches, textMatches } = self.OscarMatching;

  let queuedRuleId = null;

  async function getRules() {
    try {
      const { rules = [] } = await chrome.storage.sync.get('rules');
      return rules.filter((r) => r.enabled !== false);
    } catch {
      return [];
    }
  }

  const SANS = "system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
  const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif";

  const TOAST_THEMES = {
    dark: {
      bg: '#17150f',
      text: '#f0e9d6',
      muted: '#a39878',
      count: '#e0673d',
      accent: '#7aae7f',
      btnBg: 'transparent',
      btnBgHover: '#221e14',
      btnText: '#f0e9d6',
      btnBorder: '#f0e9d6',
      shadow: '0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px #3a3326',
      font: SANS,
      titleFont: SERIF,
      radius: '2px',
      btnRadius: '2px',
    },
    light: {
      bg: '#faf6ee',
      text: '#1a1a1a',
      muted: '#6b6257',
      count: '#c14a1a',
      accent: '#4a7c4f',
      btnBg: 'transparent',
      btnBgHover: '#f1e8cf',
      btnText: '#1a1a1a',
      btnBorder: '#1a1a1a',
      shadow: '0 10px 28px rgba(45,35,15,0.18), 0 0 0 1px #1a1a1a',
      font: SANS,
      titleFont: SERIF,
      radius: '2px',
      btnRadius: '2px',
    },
    garbage: {
      bg: '#5d6b2a',
      text: '#fff8dc',
      muted: '#d4c97a',
      count: '#c1440e',
      accent: '#9acd32',
      btnBg: '#4a5822',
      btnBgHover: '#6f7d32',
      btnText: '#fff8dc',
      btnBorder: '#8b9b3f',
      shadow: '4px 4px 0 rgba(0,0,0,0.4), 0 0 0 2px #8b9b3f',
      font: "'Comic Sans MS', 'Chalkboard SE', 'Marker Felt', cursive",
      titleFont: "Papyrus, 'Luminari', 'Copperplate', fantasy",
      radius: '3px 11px 4px 9px',
      btnRadius: '2px 5px 3px 4px',
    },
  };

  async function resolveToastTheme() {
    let stored = 'system';
    try {
      const res = await chrome.storage.sync.get('theme');
      stored = res.theme || 'system';
    } catch {}
    let resolved = stored;
    if (stored === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return TOAST_THEMES[resolved] || TOAST_THEMES.dark;
  }

  function createOverlay(ruleName, theme) {
    const host = document.createElement('div');
    host.setAttribute('data-oscar-overlay', '');
    host.style.cssText =
      'position:fixed;top:20px;right:20px;z-index:2147483647;pointer-events:none;';
    const shadow = host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      .toast {
        font-family: ${theme.font};
        background: ${theme.bg};
        color: ${theme.text};
        padding: 16px 20px 18px;
        border-radius: ${theme.radius};
        box-shadow: ${theme.shadow};
        display: flex;
        align-items: center;
        gap: 18px;
        min-width: 300px;
        pointer-events: auto;
        animation: oscar-in 0.25s cubic-bezier(.2,.9,.3,1.2);
      }
      @keyframes oscar-in {
        from { transform: translateX(30px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes oscar-out {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(30px); opacity: 0; }
      }
      .toast.leaving { animation: oscar-out 0.2s ease-in forwards; }
      .body { min-width: 0; flex: 1; }
      .eyebrow {
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: ${theme.accent};
        font-family: ${theme.font};
        margin-bottom: 4px;
      }
      .title {
        font-size: 17px;
        font-weight: 700;
        letter-spacing: -0.01em;
        color: ${theme.text};
        font-family: ${theme.titleFont || theme.font};
        line-height: 1.15;
      }
      .subtitle {
        font-size: 11px;
        color: ${theme.muted};
        margin-top: 4px;
        max-width: 180px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-style: italic;
        font-family: ${theme.titleFont || theme.font};
      }
      .count {
        font-family: ${theme.titleFont || theme.font};
        font-size: 36px;
        font-weight: 700;
        color: ${theme.count};
        font-variant-numeric: tabular-nums;
        line-height: 1;
        min-width: 36px;
        text-align: center;
        flex-shrink: 0;
        letter-spacing: -0.02em;
      }
      .cancel {
        background: ${theme.btnBg};
        border: 1px solid ${theme.btnBorder};
        color: ${theme.btnText};
        padding: 7px 13px;
        border-radius: ${theme.btnRadius};
        cursor: pointer;
        font-size: 11px;
        font-family: ${theme.font};
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        flex-shrink: 0;
      }
      .cancel:hover { background: ${theme.btnBgHover}; }
    `;
    shadow.appendChild(style);

    const toast = document.createElement('div');
    toast.className = 'toast';

    const body = document.createElement('div');
    body.className = 'body';

    const eyebrow = document.createElement('div');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = 'Oscar — closing tab';

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = ruleName || 'Matched rule';

    const subtitle = document.createElement('div');
    subtitle.className = 'subtitle';
    subtitle.textContent = 'desktop app handled it';

    body.appendChild(eyebrow);
    body.appendChild(title);
    body.appendChild(subtitle);

    const count = document.createElement('div');
    count.className = 'count';
    count.textContent = '…';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'cancel';
    cancelBtn.textContent = 'Cancel';

    toast.appendChild(body);
    toast.appendChild(count);
    toast.appendChild(cancelBtn);
    shadow.appendChild(toast);

    (document.body || document.documentElement).appendChild(host);

    let cancelHandler = null;
    cancelBtn.addEventListener('click', () => cancelHandler && cancelHandler());

    return {
      setCountdown(seconds) {
        count.textContent = String(seconds);
      },
      onCancel(fn) {
        cancelHandler = fn;
      },
      dismiss() {
        toast.classList.add('leaving');
        setTimeout(() => host.remove(), 220);
      },
    };
  }

  async function startClosure(rule, delay) {
    const endTime = Date.now() + delay;
    const theme = await resolveToastTheme();
    const overlay = createOverlay(rule.name, theme);

    const state = { cancelled: false, intervalId: null };

    overlay.onCancel(() => {
      state.cancelled = true;
      if (state.intervalId) clearInterval(state.intervalId);
      overlay.dismiss();
      chrome.runtime.sendMessage({ type: 'CANCEL_MATCH' });
    });

    chrome.runtime.sendMessage({
      type: 'MATCH_PENDING',
      ruleId: rule.id,
      ruleName: rule.name,
      delayMs: delay,
    });

    function tick() {
      if (state.cancelled) return;
      const remaining = Math.max(0, endTime - Date.now());
      const seconds = Math.ceil(remaining / 1000);
      overlay.setCountdown(seconds);
      chrome.runtime.sendMessage({ type: 'MATCH_TICK', seconds });
      if (remaining <= 0) {
        clearInterval(state.intervalId);
        chrome.runtime.sendMessage({
          type: 'CLOSE_TAB',
          ruleId: rule.id,
          ruleName: rule.name,
        });
      }
    }

    tick();
    state.intervalId = setInterval(tick, TICK_INTERVAL_MS);
  }

  async function check() {
    if (queuedRuleId) return;
    const rules = await getRules();
    if (!rules.length) return;

    const url = location.href;
    const text = (document.body && document.body.innerText) || '';

    for (const rule of rules) {
      if (!hostMatches(rule.domainPattern, url)) continue;
      if (!textMatches(rule.textPattern, rule.textMode || 'substring', text)) continue;

      queuedRuleId = rule.id;
      const delay = typeof rule.delayMs === 'number' ? rule.delayMs : DEFAULT_DELAY_MS;
      startClosure(rule, delay);
      return;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', check, { once: true });
  } else {
    check();
  }

  const observer = new MutationObserver(() => {
    if (queuedRuleId) {
      observer.disconnect();
      return;
    }
    check();
  });

  if (document.documentElement) {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  setTimeout(() => observer.disconnect(), OBSERVER_TIMEOUT_MS);
})();
