const $ = (sel) => document.querySelector(sel);

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
  const tab = await getActiveTab();
  const urlEl = $('#tab-url');
  if (!tab || !tab.url) {
    urlEl.textContent = '(no url)';
    return;
  }

  urlEl.textContent = tab.url;

  $('#add-from-current').addEventListener('click', async () => {
    let url;
    try {
      url = new URL(tab.url);
    } catch {
      $('#status').textContent = 'Could not parse URL.';
      return;
    }

    const domainPattern = url.hostname + '/*';
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

  $('#open-options').addEventListener('click', () => chrome.runtime.openOptionsPage());
}

init();
