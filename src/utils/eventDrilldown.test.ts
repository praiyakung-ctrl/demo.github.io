import { describe, expect, it } from 'vitest';
import { dailyBreakdownForMonth, daysInMonth, EVENT_CATEGORY_KEYS } from './eventDrilldown';
import type { MonthlyEventData } from '../types';

const monthRow: MonthlyEventData = {
  month: 'ก.พ.', traffic: 140, gunshot: 10, parking: 90, flood: 30, crowd: 18, other: 15,
};

describe('daysInMonth', () => {
  it('returns 28 days for February in a non-leap Christian-era year (BE 2568 = CE 2025)', () => {
    expect(daysInMonth(1, 2568)).toBe(28);
  });

  it('returns 31 days for January', () => {
    expect(daysInMonth(0, 2568)).toBe(31);
  });
});

describe('dailyBreakdownForMonth', () => {
  it('produces one row per day of the month', () => {
    const rows = dailyBreakdownForMonth(1, monthRow, 2568);
    expect(rows).toHaveLength(28);
    expect(rows[0].day).toBe(1);
    expect(rows[27].day).toBe(28);
  });

  it('sums back to exactly the monthly total for every category', () => {
    const rows = dailyBreakdownForMonth(1, monthRow, 2568);
    for (const key of EVENT_CATEGORY_KEYS) {
      const sum = rows.reduce((s, r) => s + r[key], 0);
      expect(sum).toBe(monthRow[key]);
    }
  });

  it('is deterministic — same inputs always produce the same output', () => {
    const first = dailyBreakdownForMonth(1, monthRow, 2568);
    const second = dailyBreakdownForMonth(1, monthRow, 2568);
    expect(second).toEqual(first);
  });

  it('handles a zero-count category without producing negative or NaN values', () => {
    const rows = dailyBreakdownForMonth(0, { ...monthRow, gunshot: 0 }, 2568);
    expect(rows.every(r => r.gunshot === 0)).toBe(true);
  });
});
