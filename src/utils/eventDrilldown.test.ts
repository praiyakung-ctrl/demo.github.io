import { describe, expect, it } from 'vitest';
import { dailyBreakdownFromEvents, daysInMonth, distributeTotalAcrossDays, EVENT_CATEGORY_KEYS, monthLabel } from './eventDrilldown';
import type { CctvEvent } from '../types';

function event(day: number, eventType: CctvEvent['eventType'], timestamp?: string): CctvEvent {
  return {
    id: `EVT-TEST-${day}-${eventType}`,
    cameraId: 'CAM-001',
    cameraName: 'test',
    eventType,
    timestamp: timestamp ?? `2026-02-${String(day).padStart(2, '0')}T08:00:00`,
    source: 'api',
    isAcknowledged: true,
  };
}

describe('daysInMonth', () => {
  it('returns 28 days for February in a non-leap Christian-era year (BE 2568 = CE 2025)', () => {
    expect(daysInMonth(1, 2568)).toBe(28);
  });

  it('returns 31 days for January', () => {
    expect(daysInMonth(0, 2568)).toBe(31);
  });
});

describe('dailyBreakdownFromEvents', () => {
  const events: CctvEvent[] = [
    event(3, 'traffic'),
    event(3, 'traffic'),
    event(3, 'gunshot'),
    event(14, 'flood'),
    event(1, 'traffic', '2026-01-01T08:00:00'), // different month, must be excluded
    event(5, 'normal'), // not a drilldown category, must be excluded
  ];

  it('produces one row per day of the month', () => {
    const rows = dailyBreakdownFromEvents(events, '2026-02');
    expect(rows).toHaveLength(28);
    expect(rows[0].day).toBe(1);
    expect(rows[27].day).toBe(28);
  });

  it('counts real events on the correct day and category', () => {
    const rows = dailyBreakdownFromEvents(events, '2026-02');
    expect(rows[2].traffic).toBe(2);
    expect(rows[2].gunshot).toBe(1);
    expect(rows[13].flood).toBe(1);
  });

  it('excludes events from other months and the "normal" category', () => {
    const rows = dailyBreakdownFromEvents(events, '2026-02');
    const total = rows.reduce((s, r) => s + r.traffic + r.gunshot + r.parking + r.flood + r.crowd, 0);
    expect(total).toBe(4); // 2 traffic + 1 gunshot + 1 flood on day 3/14; excludes the Jan traffic + Feb "normal" events
  });

  it('returns all-zero rows for a month with no matching events', () => {
    const rows = dailyBreakdownFromEvents(events, '2026-03');
    expect(rows.every(r => EVENT_CATEGORY_KEYS.every(k => r[k] === 0))).toBe(true);
  });
});

describe('monthLabel', () => {
  it('formats a YYYY-MM key as a Thai month + Buddhist-era year', () => {
    expect(monthLabel('2026-02')).toContain('2569');
  });
});

describe('distributeTotalAcrossDays', () => {
  it('produces one row per day of the month, summing back to exactly the total', () => {
    const rows = distributeTotalAcrossDays(217, 1, 2568, 42);
    expect(rows).toHaveLength(28);
    expect(rows.reduce((s, r) => s + r.count, 0)).toBe(217);
  });

  it('is deterministic for a given seed', () => {
    const first = distributeTotalAcrossDays(217, 1, 2568, 42);
    const second = distributeTotalAcrossDays(217, 1, 2568, 42);
    expect(second).toEqual(first);
  });

  it('produces a different split for a different seed, same total', () => {
    const a = distributeTotalAcrossDays(217, 1, 2568, 1);
    const b = distributeTotalAcrossDays(217, 1, 2568, 2);
    expect(a).not.toEqual(b);
    expect(b.reduce((s, r) => s + r.count, 0)).toBe(217);
  });

  it('returns all zeros for a total of zero', () => {
    const rows = distributeTotalAcrossDays(0, 0, 2568, 7);
    expect(rows.every(r => r.count === 0)).toBe(true);
  });
});
