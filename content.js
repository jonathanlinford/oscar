(() => {
  const DEFAULT_DELAY_MS = 2000;
  const OBSERVER_TIMEOUT_MS = 15000;
  const TICK_INTERVAL_MS = 250;

  let queuedRuleId = null;

  function globToRegex(pattern) {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp('^' + escaped + '$', 'i');
  }

  function hostMatches(pattern, url) {
    if (!pattern) return false;
    try {
      const u = new URL(url);
      const hostPath = u.hostname + u.pathname;
      const regex = globToRegex(pattern);
      return regex.test(hostPath) || regex.test(u.hostname);
    } catch {
      return false;
    }
  }

  function textMatches(pattern, mode, text) {
    if (!pattern) return true;
    if (mode === 'regex') {
      try {
        return new RegExp(pattern, 'i').test(text);
      } catch {
        return false;
      }
    }
    return text.toLowerCase().includes(pattern.toLowerCase());
  }

  async function getRules() {
    try {
      const { rules = [] } = await chrome.storage.sync.get('rules');
      return rules.filter((r) => r.enabled !== false);
    } catch {
      return [];
    }
  }

  const TOAST_THEMES = {
    dark: {
      bg: '#111827',
      text: '#ffffff',
      muted: '#9ca3af',
      count: '#ef4444',
      btnBg: 'rgba(255,255,255,0.12)',
      btnBgHover: 'rgba(255,255,255,0.2)',
      btnText: '#ffffff',
      shadow: '0 12px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)',
      font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
      radius: '12px',
      btnRadius: '6px',
    },
    light: {
      bg: '#ffffff',
      text: '#111827',
      muted: '#6b7280',
      count: '#ef4444',
      btnBg: '#f3f4f6',
      btnBgHover: '#e5e7eb',
      btnText: '#111827',
      shadow: '0 12px 32px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)',
      font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
      radius: '12px',
      btnRadius: '6px',
    },
    garbage: {
      bg: '#5d6b2a',
      text: '#fff8dc',
      muted: '#d4c97a',
      count: '#c1440e',
      btnBg: '#4a5822',
      btnBgHover: '#6f7d32',
      btnText: '#fff8dc',
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
        padding: 18px 20px;
        border-radius: ${theme.radius};
        box-shadow: ${theme.shadow};
        display: flex;
        align-items: center;
        gap: 20px;
        min-width: 280px;
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
      .title {
        font-size: 13px;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: ${theme.text};
        font-family: ${theme.titleFont || theme.font};
      }
      .subtitle {
        font-size: 11px;
        color: ${theme.muted};
        margin-top: 3px;
        max-width: 160px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .count {
        font-size: 30px;
        font-weight: 700;
        color: ${theme.count};
        font-variant-numeric: tabular-nums;
        line-height: 1;
        min-width: 30px;
        text-align: center;
        flex-shrink: 0;
      }
      .cancel {
        background: ${theme.btnBg};
        border: none;
        color: ${theme.btnText};
        padding: 8px 14px;
        border-radius: ${theme.btnRadius};
        cursor: pointer;
        font-size: 11px;
        font-family: inherit;
        font-weight: 500;
        flex-shrink: 0;
      }
      .cancel:hover { background: ${theme.btnBgHover}; }
    `;
    shadow.appendChild(style);

    const toast = document.createElement('div');
    toast.className = 'toast';

    const body = document.createElement('div');
    body.className = 'body';

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = 'Oscar closing this tab';

    const subtitle = document.createElement('div');
    subtitle.className = 'subtitle';
    subtitle.textContent = ruleName || '';

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
