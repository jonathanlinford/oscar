const $ = (sel) => document.querySelector(sel);
const body = $('#rules-body');
const emptyMsg = $('#empty');
const libraryGrid = $('#library-grid');

const RULE_LIBRARY = [
  {
    name: 'Slack message link',
    domainPattern: '*.slack.com/archives/*',
    textPattern: 'redirected you to the desktop app',
    textMode: 'substring',
    delayMs: 2000,
  },
  {
    name: 'Zoom meeting',
    domainPattern: '*.zoom.us/j/*',
    textPattern: 'Click Open Zoom Meetings',
    textMode: 'substring',
    delayMs: 2500,
  },
  {
    name: 'Microsoft Teams meeting',
    domainPattern: 'teams.microsoft.com/l/meetup-join/*',
    textPattern: 'Open Microsoft Teams',
    textMode: 'substring',
    delayMs: 2500,
  },
  {
    name: 'Webex meeting',
    domainPattern: '*.webex.com/meet/*',
    textPattern: 'Open Webex',
    textMode: 'substring',
    delayMs: 2500,
  },
  {
    name: 'Discord invite',
    domainPattern: 'discord.com/invite/*',
    textPattern: 'Open Discord',
    textMode: 'substring',
    delayMs: 2000,
  },
  {
    name: 'Figma file',
    domainPattern: 'figma.com/file/*',
    textPattern: 'Open in desktop app',
    textMode: 'substring',
    delayMs: 2000,
  },
  {
    name: 'Linear issue',
    domainPattern: 'linear.app/*',
    textPattern: 'Open in Linear',
    textMode: 'substring',
    delayMs: 2000,
  },
  {
    name: 'Notion page',
    domainPattern: '*.notion.so/*',
    textPattern: 'Open in desktop app',
    textMode: 'substring',
    delayMs: 2000,
  },
  {
    name: 'Spotify link',
    domainPattern: 'open.spotify.com/*',
    textPattern: 'Open Spotify',
    textMode: 'substring',
    delayMs: 2000,
  },
  {
    name: 'GoTo Meeting',
    domainPattern: '*.gotomeeting.com/join/*',
    textPattern: 'Open GoTo',
    textMode: 'substring',
    delayMs: 2500,
  },
];

let currentRules = [];

function patternToDomain(pattern) {
  if (!pattern) return null;
  const hostPart = String(pattern).split('/')[0];
  const cleaned = hostPart.replace(/^\*\./, '');
  if (!cleaned || cleaned.includes('*')) return null;
  return cleaned;
}

const FP_SIZE = 8;
let defaultFaviconFingerprint = null;

function chromeFaviconUrl(pattern, size = 32) {
  const domain = patternToDomain(pattern);
  if (!domain) return null;
  const url = new URL(chrome.runtime.getURL('/_favicon/'));
  url.searchParams.set('pageUrl', `https://${domain}`);
  url.searchParams.set('size', String(size));
  return url.toString();
}

function googleFaviconUrl(pattern, size = 32) {
  const domain = patternToDomain(pattern);
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
}

function fingerprintImage(img) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = FP_SIZE;
    canvas.height = FP_SIZE;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, FP_SIZE, FP_SIZE);
    const data = ctx.getImageData(0, 0, FP_SIZE, FP_SIZE).data;
    let hash = '';
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) >> 2;
      hash += avg.toString(16).padStart(2, '0');
    }
    return hash;
  } catch {
    return null;
  }
}

function probeDefaultFavicon() {
  return new Promise((resolve) => {
    const probeImg = new Image();
    const url = new URL(chrome.runtime.getURL('/_favicon/'));
    url.searchParams.set('pageUrl', `https://oscar-probe-${crypto.randomUUID()}.invalid`);
    url.searchParams.set('size', '32');
    probeImg.onload = () => resolve(fingerprintImage(probeImg));
    probeImg.onerror = () => resolve(null);
    probeImg.src = url.toString();
  });
}

function setFavicon(img, pattern) {
  const chromeUrl = chromeFaviconUrl(pattern);
  const googleUrl = googleFaviconUrl(pattern);

  if (!chromeUrl && !googleUrl) {
    img.style.visibility = 'hidden';
    return;
  }

  img.style.visibility = '';
  let phase = chromeUrl ? 'chrome' : 'google';

  img.onload = () => {
    if (phase !== 'chrome') return;
    const fp = fingerprintImage(img);
    if (fp && defaultFaviconFingerprint && fp === defaultFaviconFingerprint && googleUrl) {
      phase = 'google';
      img.src = googleUrl;
    }
  };

  img.onerror = () => {
    if (phase === 'chrome' && googleUrl) {
      phase = 'google';
      img.src = googleUrl;
    } else {
      img.style.visibility = 'hidden';
    }
  };

  img.src = chromeUrl || googleUrl;
}

function buildFaviconImg(pattern) {
  const img = el('img', { className: 'favicon', alt: '' });
  setFavicon(img, pattern);
  return img;
}

function blankRule() {
  return {
    id: crypto.randomUUID(),
    name: '',
    domainPattern: '',
    textPattern: '',
    textMode: 'substring',
    delayMs: 2000,
    enabled: true,
  };
}

async function loadRules() {
  const { rules = [] } = await chrome.storage.sync.get('rules');
  return rules;
}

async function saveRules(rules) {
  await chrome.storage.sync.set({ rules });
}

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k in node) node[k] = v;
    else node.setAttribute(k, v);
  });
  children.forEach((c) => node.appendChild(c));
  return node;
}

function validateRow(tr, rule) {
  const domainInput = tr.querySelector('input[data-field="domainPattern"]');
  const textInput = tr.querySelector('input[data-field="textPattern"]');
  const enabledInput = tr.querySelector('input[data-field="enabled"]');

  const domainOk = (rule.domainPattern || '').trim().length > 0;
  const textPresent = (rule.textPattern || '').trim().length > 0;

  domainInput.classList.toggle('invalid', !domainOk);
  domainInput.title = domainOk
    ? ''
    : 'A domain pattern is required. Example: *.slack.com/*';

  const showTextWarning = domainOk && !textPresent;
  textInput.classList.toggle('warning', showTextWarning);
  textInput.title = showTextWarning
    ? 'Warning: with no text pattern, this rule will match every page on the domain.'
    : '';

  enabledInput.disabled = !domainOk;
  enabledInput.title = domainOk
    ? ''
    : "This rule can't be enabled until it has a domain pattern.";
  tr.classList.toggle('rule-invalid', !domainOk);
}

function buildRow(rule, index) {
  const tr = el('tr');
  tr.dataset.index = String(index);

  const enabledCell = el('td', {}, [
    el('input', {
      type: 'checkbox',
      checked: !!rule.enabled,
      dataset: { field: 'enabled' },
    }),
  ]);

  const nameCell = el('td', {}, [
    el('div', { className: 'name-with-icon' }, [
      buildFaviconImg(rule.domainPattern),
      el('input', {
        type: 'text',
        value: rule.name || '',
        placeholder: 'Slack deep link',
        dataset: { field: 'name' },
      }),
    ]),
  ]);

  const domainCell = el('td', {}, [
    el('input', {
      type: 'text',
      value: rule.domainPattern || '',
      placeholder: '*.slack.com/*',
      dataset: { field: 'domainPattern' },
    }),
  ]);

  const textCell = el('td', {}, [
    el('input', {
      type: 'text',
      value: rule.textPattern || '',
      placeholder: "We've redirected you…",
      dataset: { field: 'textPattern' },
    }),
  ]);

  const modeSelect = el('select', { dataset: { field: 'textMode' } });
  ['substring', 'regex'].forEach((mode) => {
    const opt = el('option', {
      value: mode,
      textContent: mode === 'substring' ? 'Substring' : 'Regex',
      selected: (rule.textMode || 'substring') === mode,
    });
    modeSelect.appendChild(opt);
  });
  const modeCell = el('td', {}, [modeSelect]);

  const delayCell = el('td', {}, [
    el('input', {
      type: 'number',
      value: String((rule.delayMs ?? 2000) / 1000),
      min: '0',
      step: '0.1',
      dataset: { field: 'delayMs' },
    }),
  ]);

  const deleteBtn = el('button', {
    className: 'delete',
    title: 'Delete rule',
    'aria-label': 'Delete rule',
    dataset: { index: String(index) },
  });
  deleteBtn.appendChild(el('img', { src: 'icons/icon-32.png', alt: '' }));
  const deleteCell = el('td', { className: 'col-del' }, [deleteBtn]);

  [enabledCell, nameCell, domainCell, textCell, modeCell, delayCell, deleteCell].forEach((c) =>
    tr.appendChild(c),
  );
  validateRow(tr, rule);
  return tr;
}

function render() {
  while (body.firstChild) body.removeChild(body.firstChild);
  emptyMsg.hidden = currentRules.length > 0;
  currentRules.forEach((rule, index) => body.appendChild(buildRow(rule, index)));
  renderLibrary();
}

function normalizePattern(p) {
  return (p || '').trim().toLowerCase();
}

function isPresetInstalled(preset) {
  const target = normalizePattern(preset.domainPattern);
  if (!target) return false;
  return currentRules.some((r) => normalizePattern(r.domainPattern) === target);
}

function buildLibraryCard(preset) {
  const card = el('div', { className: 'library-card' });

  const head = el('div', { className: 'library-card-head' });
  const nameRow = el('div', { className: 'library-name-row' }, [
    buildFaviconImg(preset.domainPattern),
    el('div', { className: 'library-name', textContent: preset.name }),
  ]);
  const installed = isPresetInstalled(preset);
  const addBtn = el('button', {
    className: 'library-add' + (installed ? ' installed' : ''),
    textContent: installed ? 'Added' : '+ Add',
    disabled: installed,
  });
  addBtn.addEventListener('click', async () => {
    if (isPresetInstalled(preset)) return;
    const rule = { id: crypto.randomUUID(), enabled: true, ...preset };
    currentRules.push(rule);
    await saveRules(currentRules);
    render();
  });
  head.appendChild(nameRow);
  head.appendChild(addBtn);

  const details = el('div', { className: 'library-details' });
  const domainCode = el('code', { textContent: preset.domainPattern });
  const textLine = el('div', {
    className: 'library-text',
    textContent: preset.textPattern ? `"${preset.textPattern}"` : '(any text)',
  });
  details.appendChild(domainCode);
  details.appendChild(textLine);

  card.appendChild(head);
  card.appendChild(details);
  return card;
}

function renderLibrary() {
  while (libraryGrid.firstChild) libraryGrid.removeChild(libraryGrid.firstChild);
  RULE_LIBRARY.forEach((preset) => libraryGrid.appendChild(buildLibraryCard(preset)));
}

const statGrid = document.getElementById('stat-grid');
const hourlyChart = document.getElementById('hourly-chart');
const dailyChart = document.getElementById('daily-chart');
const topDomainsList = document.getElementById('top-domains');
const topRulesList = document.getElementById('top-rules');
const statsContent = document.getElementById('stats-content');
const statsEmpty = document.getElementById('stats-empty');

function statCard(label, value, sub) {
  const card = el('div', { className: 'stat-card' });
  card.appendChild(el('div', { className: 'stat-label', textContent: label }));
  card.appendChild(el('div', { className: 'stat-value', textContent: value }));
  if (sub) card.appendChild(el('div', { className: 'stat-sub', textContent: sub }));
  return card;
}

function renderHourlyChart(bars) {
  while (hourlyChart.firstChild) hourlyChart.removeChild(hourlyChart.firstChild);
  const max = Math.max(...bars, 1);
  bars.forEach((count, hour) => {
    const bar = el('div', { className: 'hourly-bar' });
    const pct = Math.max(2, Math.round((count / max) * 100));
    bar.style.height = `${pct}%`;
    bar.style.setProperty('--i', String(hour));
    bar.title = `${window.OscarAnalytics.hourLabel(hour)} — ${count} close${count === 1 ? '' : 's'}`;
    if (count === 0) bar.classList.add('empty');
    hourlyChart.appendChild(bar);
  });
}

function renderDailyChart(bars) {
  while (dailyChart.firstChild) dailyChart.removeChild(dailyChart.firstChild);
  const max = Math.max(...bars, 1);
  bars.forEach((count, day) => {
    const row = el('div', { className: 'daily-row' });
    row.appendChild(
      el('div', {
        className: 'daily-label',
        textContent: window.OscarAnalytics.DAY_LABELS[day],
      }),
    );
    const track = el('div', { className: 'daily-bar-track' });
    const fill = el('div', { className: 'daily-bar-fill' });
    fill.style.width = `${Math.max(2, Math.round((count / max) * 100))}%`;
    fill.style.setProperty('--i', String(day));
    if (count === 0) fill.classList.add('empty');
    track.appendChild(fill);
    row.appendChild(track);
    row.appendChild(el('div', { className: 'daily-count', textContent: String(count) }));
    dailyChart.appendChild(row);
  });
}

function renderLeaderboard(listEl, items, getName, getCount) {
  while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
  if (!items.length) {
    listEl.appendChild(el('li', { className: 'leaderboard-empty', textContent: '—' }));
    return;
  }
  const max = items[0] ? getCount(items[0]) : 1;
  items.forEach((item, i) => {
    const li = el('li', { className: 'leaderboard-item' });
    const name = el('div', { className: 'leaderboard-name', textContent: getName(item) });
    const count = el('div', { className: 'leaderboard-count', textContent: String(getCount(item)) });
    const track = el('div', { className: 'leaderboard-track' });
    const fill = el('div', { className: 'leaderboard-fill' });
    fill.style.width = `${Math.max(4, Math.round((getCount(item) / max) * 100))}%`;
    fill.style.setProperty('--i', String(i));
    track.appendChild(fill);
    li.appendChild(name);
    li.appendChild(track);
    li.appendChild(count);
    listEl.appendChild(li);
  });
}

async function renderStats() {
  const OA = window.OscarAnalytics;
  const raw = await OA.load();
  const insights = OA.computeInsights(raw);

  if (insights.totalCloses === 0 && insights.totalCancels === 0) {
    statsContent.hidden = true;
    statsEmpty.hidden = false;
    return;
  }

  statsContent.hidden = false;
  statsEmpty.hidden = true;

  while (statGrid.firstChild) statGrid.removeChild(statGrid.firstChild);
  statGrid.appendChild(
    statCard(
      'Tabs closed',
      String(insights.totalCloses),
      `since ${OA.formatDate(insights.firstCloseAt)}`,
    ),
  );
  statGrid.appendChild(
    statCard(
      'Time saved',
      OA.formatDuration(insights.timeSavedSec),
      `~${OA.TIME_SAVED_SEC_PER_CLOSE}s per tab`,
    ),
  );
  statGrid.appendChild(statCard('Today', String(insights.todayCount), 'closures'));
  statGrid.appendChild(statCard('Past 7 days', String(insights.weekCount), 'closures'));
  statGrid.appendChild(
    statCard(
      'Peak hour',
      insights.peakHourCount > 0 ? insights.peakHourLabel : '—',
      insights.peakHourCount > 0 ? `${insights.peakHourCount} closes` : 'no data',
    ),
  );
  statGrid.appendChild(
    statCard(
      'Peak day',
      insights.peakDayCount > 0 ? insights.peakDayLabel : '—',
      insights.peakDayCount > 0 ? `${insights.peakDayCount} closes` : 'no data',
    ),
  );
  statGrid.appendChild(
    statCard(
      'Cancel rate',
      `${Math.round(insights.cancelRate * 100)}%`,
      `${insights.totalCancels} of ${insights.totalMatches}`,
    ),
  );
  statGrid.appendChild(
    statCard(
      'Current streak',
      insights.currentStreak > 0 ? `${insights.currentStreak}d` : '0d',
      insights.longestStreak > 0 ? `longest ${insights.longestStreak}d` : '',
    ),
  );

  renderHourlyChart(insights.hourlyBars);
  renderDailyChart(insights.dailyBars);
  renderLeaderboard(topDomainsList, insights.topDomains, (d) => d.host, (d) => d.count);
  renderLeaderboard(topRulesList, insights.topRules, (r) => r.name, (r) => r.closeCount);
}

async function initStats() {
  await renderStats();
  document.getElementById('reset-stats').addEventListener('click', async () => {
    if (!confirm('Reset all Oscar stats? This cannot be undone.')) return;
    await window.OscarAnalytics.reset();
    await renderStats();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[window.OscarAnalytics.KEY]) {
      renderStats();
    }
  });
}

async function initThemePicker() {
  const current = await window.OscarTheme.get();
  document.querySelectorAll('input[name="theme"]').forEach((input) => {
    input.checked = input.value === current;
    input.addEventListener('change', () => {
      if (input.checked) window.OscarTheme.set(input.value);
    });
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync' || !changes.theme) return;
    const next = changes.theme.newValue || 'system';
    document.querySelectorAll('input[name="theme"]').forEach((input) => {
      input.checked = input.value === next;
    });
  });
}

function initHelpModal() {
  const modal = document.getElementById('help-modal');
  const opener = document.getElementById('rules-help');
  const closer = modal.querySelector('.modal-close');
  if (!modal || !opener) return;

  opener.addEventListener('click', () => modal.showModal());
  closer.addEventListener('click', () => modal.close());

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.close();
  });
}

async function init() {
  const [rules, fp] = await Promise.all([loadRules(), probeDefaultFavicon()]);
  currentRules = rules;
  defaultFaviconFingerprint = fp;
  render();
  initThemePicker();
  initStats();
  initHelpModal();
}

body.addEventListener('input', async (e) => {
  const target = e.target;
  const tr = target.closest('tr');
  if (!tr) return;
  const index = Number(tr.dataset.index);
  const field = target.dataset.field;
  if (!field) return;

  let value;
  if (target.type === 'checkbox') {
    value = target.checked;
  } else if (target.type === 'number') {
    if (target.value === '' || target.value === '-') return;
    const parsed = Number(target.value);
    if (Number.isNaN(parsed)) return;
    value = field === 'delayMs' ? Math.round(parsed * 1000) : parsed;
  } else {
    value = target.value;
  }

  currentRules[index][field] = value;

  if (field === 'domainPattern') {
    const img = tr.querySelector('img.favicon');
    if (img) setFavicon(img, value);
  }

  if (field === 'domainPattern' || field === 'textPattern') {
    validateRow(tr, currentRules[index]);
  }

  await saveRules(currentRules);
});

body.addEventListener('change', async (e) => {
  if (e.target.tagName !== 'SELECT') return;
  const tr = e.target.closest('tr');
  if (!tr) return;
  const index = Number(tr.dataset.index);
  currentRules[index][e.target.dataset.field] = e.target.value;
  await saveRules(currentRules);
});

body.addEventListener('click', async (e) => {
  const btn = e.target.closest('.delete');
  if (!btn) return;
  const index = Number(btn.dataset.index);
  const row = btn.closest('tr');
  if (row && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    row.classList.add('leaving');
    await new Promise((r) => setTimeout(r, 260));
  }
  currentRules.splice(index, 1);
  await saveRules(currentRules);
  render();
});

$('#add-rule').addEventListener('click', async () => {
  currentRules.push(blankRule());
  await saveRules(currentRules);
  render();
  const lastRow = body.querySelector('tr:last-child input[data-field="name"]');
  if (lastRow) lastRow.focus();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync' || !changes.rules) return;
  const newRules = changes.rules.newValue || [];
  if (JSON.stringify(newRules) === JSON.stringify(currentRules)) return;
  currentRules = newRules;
  render();
});

init();
