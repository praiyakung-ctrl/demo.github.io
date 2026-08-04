import type { MonthlyEventData } from '../types';

export const EVENT_CATEGORY_KEYS = ['traffic', 'gunshot', 'parking', 'flood', 'crowd'] as const;
export type EventCategoryKey = (typeof EVENT_CATEGORY_KEYS)[number];

export interface DailyEventRow {
  day: number;
  traffic: number;
  gunshot: number;
  parking: number;
  flood: number;
  crowd: number;
}

/* yearBE = Buddhist-era year shown in the chart title (e.g. 2568) */
export function daysInMonth(monthIndex: number, yearBE: number): number {
  return new Date(yearBE - 543, monthIndex + 1, 0).getDate();
}

/* Deterministic mulberry32 PRNG — same seed always produces the same sequence,
   so the "daily breakdown" of a given month never changes between renders/sessions. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Distributes `total` across `count` days using seeded random weights, then
   rounds with the largest-remainder method so the daily values always sum
   back to exactly `total` (no drift from naive rounding). */
function distribute(total: number, count: number, rng: () => number): number[] {
  if (total <= 0) return new Array(count).fill(0);
  const weights = Array.from({ length: count }, () => rng() + 0.15); // +0.15 avoids near-zero days
  const weightSum = weights.reduce((s, w) => s + w, 0);
  const raw = weights.map(w => (w / weightSum) * total);
  const floors = raw.map(Math.floor);
  let remainder = total - floors.reduce((s, v) => s + v, 0);
  const order = raw
    .map((v, i) => ({ i, frac: v - floors[i] }))
    .sort((a, b) => b.frac - a.frac);
  const result = [...floors];
  for (let k = 0; k < order.length && remainder > 0; k++, remainder--) {
    result[order[k].i] += 1;
  }
  return result;
}

export interface DailyTotalRow {
  day: number;
  count: number;
}

/* Generic single-series version of the same seeded daily split — used by
   reports whose monthly chart is a single aggregate number per period
   (e.g. the multi-year comparison trend) rather than a per-category stack. */
export function distributeTotalAcrossDays(total: number, monthIndex: number, yearBE: number, seed: number): DailyTotalRow[] {
  const dayCount = daysInMonth(monthIndex, yearBE);
  const values = distribute(total, dayCount, mulberry32(seed));
  return values.map((count, i) => ({ day: i + 1, count }));
}

/* No per-day incident dataset exists in this demo (only pre-aggregated
   monthly totals) — this fabricates a plausible, stable daily split of each
   month's totals per category, seeded by month index so it is identical on
   every render instead of re-randomizing each time. */
export function dailyBreakdownForMonth(monthIndex: number, monthRow: MonthlyEventData, yearBE: number): DailyEventRow[] {
  const count = daysInMonth(monthIndex, yearBE);
  const perCategory: Record<EventCategoryKey, number[]> = {
    traffic: distribute(monthRow.traffic, count, mulberry32(monthIndex * 100 + 1)),
    gunshot: distribute(monthRow.gunshot, count, mulberry32(monthIndex * 100 + 2)),
    parking: distribute(monthRow.parking, count, mulberry32(monthIndex * 100 + 3)),
    flood: distribute(monthRow.flood, count, mulberry32(monthIndex * 100 + 4)),
    crowd: distribute(monthRow.crowd, count, mulberry32(monthIndex * 100 + 5)),
  };
  return Array.from({ length: count }, (_, i) => ({
    day: i + 1,
    traffic: perCategory.traffic[i],
    gunshot: perCategory.gunshot[i],
    parking: perCategory.parking[i],
    flood: perCategory.flood[i],
    crowd: perCategory.crowd[i],
  }));
}
