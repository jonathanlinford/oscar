const $ = (sel) => document.querySelector(sel);
const { patternFromUrl } = window.OscarMatching;

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function renderTeaser() {
  const OA = window.OscarAnalytics;
  if (!OA) return;
  const raw = await OA.load();
  const insights = OA.computeInsights(raw);
  if (insights.totalCloses === 0) return;

  $('#stats-teaser').hidden = false;
  $('#teaser-total').textContent = String(insights.totalCloses);
  $('#teaser-today').textContent = String(insights.todayCount);
  $('#teaser-saved').textContent = OA.formatDuration(insights.timeSavedSec);
}

async function init() {
  renderTeaser();

  // Wire this first so "Manage rules…" works on every tab. It must not depend
  // on the active tab exposing a URL.
  $('#open-options').addEventListener('click', () => chrome.runtime.openOptionsPage());

  const tab = await getActiveTab();
  const urlEl = $('#tab-url');
  const addBtn = $('#add-from-current');

  // Oscar has no `tabs` permission, so Chrome only populates tab.url for pages
  // Oscar has host access to. Internal pages (chrome://, the Web Store, other
  // extensions) come back without one — and a rule couldn't target them anyway.
  const url = tab && tab.url ? tab.url : '';
  const domainPattern = patternFromUrl(url);

  if (!domainPattern) {
    urlEl.textContent = url || '(no url)';
    addBtn.disabled = true;
    $('#status').textContent = 'Rules can only be created for http(s) pages.';
    return;
  }

  urlEl.textContent = url;

  addBtn.addEventListener('click', async () => {
    const { rules = [] } = await chrome.storage.sync.get('rules');

    const newRule = {
      id: crypto.randomUUID(),
      domainPattern,
      textPattern: '',
      textMode: 'substring',
      delayMs: 2000,
      enabled: true,
    };

    rules.push(newRule);
    await chrome.storage.sync.set({ rules });
    $('#status').textContent = 'Rule added. Opening options…';
    setTimeout(() => chrome.runtime.openOptionsPage(), 400);
  });
}

init();
