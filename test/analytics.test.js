'use strict';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { OscarAnalytics, resetAnalyticsState } = require('./helpers');

describe('formatDuration', () => {
  const f = OscarAnalytics.formatDuration;

  test('zero and negative values yield 0s', () => {
    assert.equal(f(0), '0s');
    assert.equal(f(-10), '0s');
    assert.equal(f(null), '0s');
  });

  test('sub-minute uses seconds', () => {
    assert.equal(f(1), '1s');
    assert.equal(f(59), '59s');
  });

  test('sub-hour uses minutes', () => {
    assert.equal(f(60), '1m');
    assert.equal(f(3599), '60m');
  });

  test('sub-day uses hours with one decimal below 10h', () => {
    assert.equal(f(3600), '1.0h');
    assert.equal(f(3600 * 1.5), '1.5h');
    assert.equal(f(3600 * 10), '10h');
  });

  test('day range uses days with one decimal below 10d', () => {
    assert.equal(f(86400), '1.0d');
    assert.equal(f(86400 * 2.5), '2.5d');
    assert.equal(f(86400 * 10), '10d');
  });
});

describe('dateKey', () => {
  test('formats as YYYY-MM-DD', () => {
    const d = new Date(2026, 3, 5); // local time, Apr 5 2026
    assert.equal(OscarAnalytics.dateKey(d), '2026-04-05');
  });

  test('zero-pads month and day', () => {
    const d = new Date(2026, 0, 1);
    assert.equal(OscarAnalytics.dateKey(d), '2026-01-01');
  });
});

describe('hourLabel', () => {
  const h = OscarAnalytics.hourLabel;

  test('midnight and noon', () => {
    assert.equal(h(0), '12am');
    assert.equal(h(12), '12pm');
  });

  test('am and pm boundaries', () => {
    assert.equal(h(1), '1am');
    assert.equal(h(11), '11am');
    assert.equal(h(13), '1pm');
    assert.equal(h(23), '11pm');
  });
});

describe('coerce', () => {
  test('blank input returns a blank record', () => {
    const b = OscarAnalytics.coerce(null);
    assert.equal(b.totalCloses, 0);
    assert.equal(b.totalCancels, 0);
    assert.equal(b.hourly.length, 24);
    assert.equal(b.daily.length, 7);
    assert.equal(Object.keys(b.rules).length, 0);
    assert.equal(Object.keys(b.domains).length, 0);
    assert.ok(Array.isArray(b.recentCloses));
  });

  test('fills missing hourly/daily slots with zeros', () => {
    const b = OscarAnalytics.coerce({ totalCloses: 5, hourly: [1, 2] });
    assert.equal(b.totalCloses, 5);
    assert.equal(b.hourly[0], 1);
    assert.equal(b.hourly[1], 2);
    assert.equal(b.hourly[23], 0);
    assert.equal(b.hourly.length, 24);
  });

  test('defends against non-array recentCloses', () => {
    const b = OscarAnalytics.coerce({ recentCloses: 'oops' });
    assert.ok(Array.isArray(b.recentCloses));
    assert.equal(b.recentCloses.length, 0);
  });

  test('undefined input returns a blank record', () => {
    const b = OscarAnalytics.coerce(undefined);
    assert.equal(b.totalCloses, 0);
  });
});

describe('computeInsights', () => {
  test('empty data returns all-zero summary', () => {
    const i = OscarAnalytics.computeInsights(null);
    assert.equal(i.totalCloses, 0);
    assert.equal(i.totalCancels, 0);
    assert.equal(i.totalMatches, 0);
    assert.equal(i.timeSavedSec, 0);
    assert.equal(i.cancelRate, 0);
    assert.deepEqual(i.topDomains, []);
    assert.deepEqual(i.topRules, []);
  });

  test('topDomains is sorted descending and capped at 5', () => {
    const raw = {
      totalCloses: 21,
      domains: {
        'a.com': { closeCount: 1 },
        'b.com': { closeCount: 5 },
        'c.com': { closeCount: 3 },
        'd.com': { closeCount: 2 },
        'e.com': { closeCount: 4 },
        'f.com': { closeCount: 6 },
      },
    };
    const i = OscarAnalytics.computeInsights(raw);
    assert.equal(i.topDomains.length, 5);
    assert.deepEqual(
      i.topDomains.map((d) => d.host),
      ['f.com', 'b.com', 'e.com', 'c.com', 'd.com'],
    );
  });

  test('topRules is sorted by closeCount and retains cancel counts', () => {
    const raw = {
      rules: {
        r1: { name: 'One', closeCount: 3, cancelCount: 1 },
        r2: { name: 'Two', closeCount: 10, cancelCount: 2 },
      },
    };
    const i = OscarAnalytics.computeInsights(raw);
    assert.equal(i.topRules[0].name, 'Two');
    assert.equal(i.topRules[0].closeCount, 10);
    assert.equal(i.topRules[0].cancelCount, 2);
  });

  test('topRules handles unnamed rules gracefully', () => {
    const raw = { rules: { r1: { closeCount: 5 } } };
    const i = OscarAnalytics.computeInsights(raw);
    assert.equal(i.topRules[0].name, 'Unnamed');
  });

  test('peakHour points at the max hour', () => {
    const hourly = Array(24).fill(0);
    hourly[14] = 7;
    hourly[9] = 3;
    const i = OscarAnalytics.computeInsights({ hourly });
    assert.equal(i.peakHour, 14);
    assert.equal(i.peakHourCount, 7);
    assert.equal(i.peakHourLabel, '2pm');
  });

  test('peakDay picks the busiest day of the week', () => {
    const daily = [0, 0, 20, 5, 0, 0, 0];
    const i = OscarAnalytics.computeInsights({ daily });
    assert.equal(i.peakDay, 2);
    assert.equal(i.peakDayCount, 20);
    assert.equal(i.peakDayLabel, 'Tuesday');
  });

  test('cancelRate is cancels / (closes + cancels)', () => {
    const i = OscarAnalytics.computeInsights({ totalCloses: 8, totalCancels: 2 });
    assert.equal(i.totalMatches, 10);
    assert.equal(i.cancelRate, 0.2);
  });

  test('timeSavedSec scales with totalCloses', () => {
    const i = OscarAnalytics.computeInsights({ totalCloses: 12 });
    assert.equal(i.timeSavedSec, 12 * OscarAnalytics.TIME_SAVED_SEC_PER_CLOSE);
  });

  test('currentStreak counts consecutive days with closes ending today', () => {
    const now = new Date();
    const DAY = 86400000;
    const byDate = {};
    for (let i = 0; i < 4; i++) {
      const d = new Date(now.getTime() - i * DAY);
      byDate[OscarAnalytics.dateKey(d)] = 1;
    }
    const insights = OscarAnalytics.computeInsights({ byDate });
    assert.ok(insights.currentStreak >= 4);
  });
});

describe('formatDate', () => {
  test('returns placeholder for missing timestamps', () => {
    assert.equal(OscarAnalytics.formatDate(null), '—');
    assert.equal(OscarAnalytics.formatDate(0), '—');
  });

  test('returns a non-empty string for real timestamps', () => {
    const out = OscarAnalytics.formatDate(Date.now());
    assert.ok(typeof out === 'string');
    assert.ok(out.length > 0);
    assert.notEqual(out, '—');
  });
});

describe('recordClose + recordCancel', () => {
  beforeEach(() => resetAnalyticsState());

  test('recordClose bumps counters and records per-rule + per-domain stats', async () => {
    await OscarAnalytics.recordClose({
      url: 'https://app.slack.com/archives/C123',
      ruleId: 'r1',
      ruleName: 'Slack',
      delayMs: 2000,
    });
    const a = await OscarAnalytics.load();
    assert.equal(a.totalCloses, 1);
    assert.equal(a.rules.r1.closeCount, 1);
    assert.equal(a.domains['app.slack.com'].closeCount, 1);
    assert.equal(a.recentCloses.length, 1);
    assert.equal(a.recentCloses[0].host, 'app.slack.com');
  });

  test('recordClose without a ruleId or url still bumps the total', async () => {
    await OscarAnalytics.recordClose({});
    const a = await OscarAnalytics.load();
    assert.equal(a.totalCloses, 1);
    assert.equal(Object.keys(a.rules).length, 0);
    assert.equal(Object.keys(a.domains).length, 0);
  });

  test('recordClose with a malformed URL skips the domain bookkeeping', async () => {
    await OscarAnalytics.recordClose({ url: 'not-a-url', ruleId: 'r1', ruleName: 'R' });
    const a = await OscarAnalytics.load();
    assert.equal(a.totalCloses, 1);
    assert.equal(Object.keys(a.domains).length, 0);
  });

  test('recordCancel bumps totals without touching closes', async () => {
    await OscarAnalytics.recordCancel({ ruleId: 'r1', ruleName: 'Slack' });
    const a = await OscarAnalytics.load();
    assert.equal(a.totalCancels, 1);
    assert.equal(a.totalCloses, 0);
    assert.equal(a.rules.r1.cancelCount, 1);
  });

  test('recordCancel without a ruleId still bumps the total', async () => {
    await OscarAnalytics.recordCancel({});
    const a = await OscarAnalytics.load();
    assert.equal(a.totalCancels, 1);
  });

  test('recentCloses is capped at 100', async () => {
    for (let i = 0; i < 105; i++) {
      await OscarAnalytics.recordClose({
        url: `https://site-${i}.example.com/`,
        ruleId: 'r1',
        ruleName: 'R',
        delayMs: 1000,
      });
    }
    const a = await OscarAnalytics.load();
    assert.equal(a.totalCloses, 105);
    assert.equal(a.recentCloses.length, 100);
    assert.equal(a.recentCloses[0].host, 'site-5.example.com');
    assert.equal(a.recentCloses[99].host, 'site-104.example.com');
  });

  test('reset zeroes everything', async () => {
    await OscarAnalytics.recordClose({ url: 'https://a.com', ruleId: 'r1', ruleName: 'R' });
    await OscarAnalytics.reset();
    const a = await OscarAnalytics.load();
    assert.equal(a.totalCloses, 0);
    assert.equal(Object.keys(a.rules).length, 0);
  });
});
