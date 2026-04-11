(() => {
  const KEY = 'analytics';
  const DAY_MS = 24 * 60 * 60 * 1000;
  const RECENT_LIMIT = 100;
  const TIME_SAVED_SEC_PER_CLOSE = 5;

  let chain = Promise.resolve();

  function blank() {
    return {
      version: 1,
      totalCloses: 0,
      totalCancels: 0,
      firstCloseAt: null,
      lastCloseAt: null,
      rules: {},
      domains: {},
      hourly: Array(24).fill(0),
      daily: Array(7).fill(0),
      byDate: {},
      recentCloses: [],
    };
  }

  function coerce(stored) {
    const base = blank();
    if (!stored || typeof stored !== 'object') return base;
    return {
      ...base,
      ...stored,
      rules: stored.rules || {},
      domains: stored.domains || {},
      hourly: Array.from({ length: 24 }, (_, i) => (stored.hourly && stored.hourly[i]) || 0),
      daily: Array.from({ length: 7 }, (_, i) => (stored.daily && stored.daily[i]) || 0),
      byDate: stored.byDate || {},
      recentCloses: Array.isArray(stored.recentCloses) ? stored.recentCloses : [],
    };
  }

  async function load() {
    const res = await chrome.storage.local.get(KEY);
    return coerce(res[KEY]);
  }

  async function save(data) {
    await chrome.storage.local.set({ [KEY]: data });
  }

  function enqueue(fn) {
    const next = chain.then(fn, fn);
    chain = next.catch(() => {});
    return next;
  }

  function dateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function safeHostname(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }

  async function recordClose({ url, ruleId, ruleName, delayMs }) {
    return enqueue(async () => {
      const a = await load();
      const now = Date.now();
      const d = new Date(now);

      a.totalCloses += 1;
      a.firstCloseAt = a.firstCloseAt || now;
      a.lastCloseAt = now;

      if (ruleId) {
        const rule = a.rules[ruleId] || { name: ruleName || '', closeCount: 0, cancelCount: 0 };
        rule.name = ruleName || rule.name;
        rule.closeCount = (rule.closeCount || 0) + 1;
        rule.lastClosedAt = now;
        a.rules[ruleId] = rule;
      }

      const host = safeHostname(url);
      if (host) {
        const dom = a.domains[host] || { closeCount: 0 };
        dom.closeCount = (dom.closeCount || 0) + 1;
        dom.lastClosedAt = now;
        a.domains[host] = dom;
      }

      a.hourly[d.getHours()] += 1;
      a.daily[d.getDay()] += 1;

      const key = dateKey(d);
      a.byDate[key] = (a.byDate[key] || 0) + 1;

      a.recentCloses.push({
        url: url || '',
        host,
        ruleId: ruleId || null,
        ruleName: ruleName || '',
        at: now,
        delayMs: delayMs || 0,
      });
      if (a.recentCloses.length > RECENT_LIMIT) {
        a.recentCloses.splice(0, a.recentCloses.length - RECENT_LIMIT);
      }

      await save(a);
    });
  }

  async function recordCancel({ ruleId, ruleName }) {
    return enqueue(async () => {
      const a = await load();
      a.totalCancels += 1;
      if (ruleId) {
        const rule = a.rules[ruleId] || { name: ruleName || '', closeCount: 0, cancelCount: 0 };
        rule.name = ruleName || rule.name;
        rule.cancelCount = (rule.cancelCount || 0) + 1;
        a.rules[ruleId] = rule;
      }
      await save(a);
    });
  }

  async function reset() {
    return enqueue(async () => {
      await save(blank());
    });
  }

  function hourLabel(h) {
    if (h === 0) return '12am';
    if (h < 12) return `${h}am`;
    if (h === 12) return '12pm';
    return `${h - 12}pm`;
  }

  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DAY_LABELS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function formatDuration(totalSeconds) {
    if (!totalSeconds || totalSeconds < 0) return '0s';
    if (totalSeconds < 60) return `${Math.round(totalSeconds)}s`;
    if (totalSeconds < 3600) return `${Math.round(totalSeconds / 60)}m`;
    if (totalSeconds < 86400) {
      const h = totalSeconds / 3600;
      return h >= 10 ? `${Math.round(h)}h` : `${h.toFixed(1)}h`;
    }
    const d = totalSeconds / 86400;
    return d >= 10 ? `${Math.round(d)}d` : `${d.toFixed(1)}d`;
  }

  function formatDate(ts) {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  }

  function computeInsights(raw) {
    const a = coerce(raw);
    const now = Date.now();
    const today = new Date(now);
    const todayStr = dateKey(today);

    let todayCount = a.byDate[todayStr] || 0;
    let weekCount = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(now - i * DAY_MS);
      weekCount += a.byDate[dateKey(d)] || 0;
    }

    let peakHour = 0;
    let peakHourCount = 0;
    a.hourly.forEach((count, h) => {
      if (count > peakHourCount) {
        peakHourCount = count;
        peakHour = h;
      }
    });

    let peakDay = 0;
    let peakDayCount = 0;
    a.daily.forEach((count, d) => {
      if (count > peakDayCount) {
        peakDayCount = count;
        peakDay = d;
      }
    });

    const topDomains = Object.entries(a.domains)
      .map(([host, stats]) => ({ host, count: stats.closeCount || 0 }))
      .sort((x, y) => y.count - x.count)
      .slice(0, 5);

    const topRules = Object.entries(a.rules)
      .map(([id, stats]) => ({
        id,
        name: stats.name || 'Unnamed',
        closeCount: stats.closeCount || 0,
        cancelCount: stats.cancelCount || 0,
      }))
      .sort((x, y) => y.closeCount - x.closeCount)
      .slice(0, 5);

    let currentStreak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(now - i * DAY_MS);
      const count = a.byDate[dateKey(d)] || 0;
      if (count > 0) {
        currentStreak += 1;
      } else if (i === 0) {
        continue;
      } else {
        break;
      }
    }

    let longestStreak = 0;
    const sortedDates = Object.keys(a.byDate).sort();
    let run = 0;
    let lastDate = null;
    for (const k of sortedDates) {
      const d = new Date(k);
      if (lastDate) {
        const diff = Math.round((d - lastDate) / DAY_MS);
        run = diff === 1 ? run + 1 : 1;
      } else {
        run = 1;
      }
      if (run > longestStreak) longestStreak = run;
      lastDate = d;
    }

    const totalMatches = a.totalCloses + a.totalCancels;
    const cancelRate = totalMatches > 0 ? a.totalCancels / totalMatches : 0;

    const timeSavedSec = a.totalCloses * TIME_SAVED_SEC_PER_CLOSE;

    return {
      totalCloses: a.totalCloses,
      totalCancels: a.totalCancels,
      totalMatches,
      firstCloseAt: a.firstCloseAt,
      lastCloseAt: a.lastCloseAt,
      todayCount,
      weekCount,
      peakHour,
      peakHourCount,
      peakHourLabel: hourLabel(peakHour),
      peakDay,
      peakDayCount,
      peakDayLabel: DAY_LABELS_FULL[peakDay],
      topDomains,
      topRules,
      currentStreak,
      longestStreak,
      cancelRate,
      timeSavedSec,
      hourlyBars: a.hourly,
      dailyBars: a.daily,
      recentCloses: a.recentCloses,
    };
  }

  const api = {
    KEY,
    blank,
    coerce,
    load,
    save,
    recordClose,
    recordCancel,
    reset,
    computeInsights,
    formatDuration,
    formatDate,
    hourLabel,
    dateKey,
    DAY_LABELS,
    DAY_LABELS_FULL,
    TIME_SAVED_SEC_PER_CLOSE,
  };

  if (typeof self !== 'undefined') self.OscarAnalytics = api;
  if (typeof window !== 'undefined') window.OscarAnalytics = api;
})();
