export type Granularity = 'month' | 'quarter' | 'year';

export interface UsageRecord {
  year: number;
  month: number; // 1-12
  group: string;
  category: string;
  count: number;
  officers?: number;
  totalMinutes?: number;
  downloads?: number;
}

export function quarterOf(month: number): number {
  return Math.ceil(month / 3);
}

function monthsInQuarter(quarter: number): number[] {
  const start = (quarter - 1) * 3 + 1;
  return [start, start + 1, start + 2];
}

/* Filters records down to one period (a month, a quarter, or a whole year). */
export function filterByPeriod(
  rows: UsageRecord[],
  granularity: Granularity,
  year: number,
  month?: number,
  quarter?: number
): UsageRecord[] {
  return rows.filter(r => {
    if (r.year !== year) return false;
    if (granularity === 'year') return true;
    if (granularity === 'quarter') return quarter ? monthsInQuarter(quarter).includes(r.month) : true;
    return month ? r.month === month : true;
  });
}

/* The period immediately before the given one, at the same granularity
   (previous month, previous quarter, or previous year). */
export function previousPeriod(
  granularity: Granularity,
  year: number,
  month?: number,
  quarter?: number
): { year: number; month?: number; quarter?: number } {
  if (granularity === 'year') return { year: year - 1 };
  if (granularity === 'quarter') {
    const q = quarter ?? 1;
    return q > 1 ? { year, quarter: q - 1 } : { year: year - 1, quarter: 4 };
  }
  const m = month ?? 1;
  return m > 1 ? { year, month: m - 1 } : { year: year - 1, month: 12 };
}

export function totalCount(rows: UsageRecord[]): number {
  return rows.reduce((s, r) => s + r.count, 0);
}

export function totalMetric(rows: UsageRecord[], key: 'officers' | 'totalMinutes' | 'downloads'): number {
  return rows.reduce((s, r) => s + (r[key] ?? 0), 0);
}

export function distinctGroups(rows: UsageRecord[]): number {
  return new Set(rows.map(r => r.group)).size;
}

export interface GroupTotal { group: string; count: number; trendPct: number | null }

/* Ranked totals per `group` (station/district/road), with trend vs the same
   group's total in the previous period. */
export function groupTotals(rows: UsageRecord[], prevRows: UsageRecord[]): GroupTotal[] {
  const groups = new Set(rows.map(r => r.group));
  const result: GroupTotal[] = [...groups].map(group => {
    const count = rows.filter(r => r.group === group).reduce((s, r) => s + r.count, 0);
    const prevCount = prevRows.filter(r => r.group === group).reduce((s, r) => s + r.count, 0);
    const trendPct = prevCount > 0 ? ((count - prevCount) / prevCount) * 100 : (count > 0 ? 100 : 0);
    return { group, count, trendPct };
  });
  return result.sort((a, b) => b.count - a.count);
}

export interface CategoryTotal { category: string; count: number; pct: number }

/* Share of each `category` (purpose/event-type/vehicle-type) within the period. */
export function categoryTotals(rows: UsageRecord[]): CategoryTotal[] {
  const categories = new Set(rows.map(r => r.category));
  const total = totalCount(rows);
  return [...categories]
    .map(category => {
      const count = rows.filter(r => r.category === category).reduce((s, r) => s + r.count, 0);
      return { category, count, pct: total > 0 ? (count / total) * 100 : 0 };
    })
    .sort((a, b) => b.count - a.count);
}

export interface YearTotal { year: number; count: number }

export function yearlySeries(rows: UsageRecord[], years: number[]): YearTotal[] {
  return years.map(year => ({ year, count: rows.filter(r => r.year === year).reduce((s, r) => s + r.count, 0) }));
}

const MONTH_LABELS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const QUARTER_LABELS = ['ไตรมาส 1', 'ไตรมาส 2', 'ไตรมาส 3', 'ไตรมาส 4'];

/* Pivots totals into one row per month (or quarter), one column per year —
   feeds the multi-year trend line chart. */
export function seriesByYear(
  rows: UsageRecord[],
  years: number[],
  granularity: 'month' | 'quarter'
): Record<string, number | string>[] {
  const buckets = granularity === 'month' ? 12 : 4;
  const labels = granularity === 'month' ? MONTH_LABELS : QUARTER_LABELS;
  return Array.from({ length: buckets }, (_, i) => {
    const bucketIndex = i + 1;
    const row: Record<string, number | string> = { label: labels[i] };
    for (const year of years) {
      row[String(year)] = rows
        .filter(r => r.year === year && (granularity === 'month' ? r.month === bucketIndex : quarterOf(r.month) === bucketIndex))
        .reduce((s, r) => s + r.count, 0);
    }
    return row;
  });
}

const DAY_LABELS = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];
const HOUR_BUCKET_LABELS = ['00-04', '04-08', '08-12', '12-16', '16-20', '20-24'];

/* Weekdays and daytime hours carry more weight than weekends/night — a fixed,
   documented pattern (the system has never logged per-record timestamps),
   scaled to the selected period's real total so the table still reacts to filters. */
const DAY_WEIGHTS = [1.15, 1.1, 1.1, 1.1, 1.2, 0.7, 0.65];
const HOUR_WEIGHTS = [0.25, 0.6, 1.5, 1.3, 1.6, 0.8];

export interface HeatmapRow { day: string; cells: number[] }

export function heatmapPattern(total: number): HeatmapRow[] {
  const dayWeightSum = DAY_WEIGHTS.reduce((s, w) => s + w, 0);
  const hourWeightSum = HOUR_WEIGHTS.reduce((s, w) => s + w, 0);
  return DAY_LABELS.map((day, di) => ({
    day,
    cells: HOUR_WEIGHTS.map((hw) => {
      const share = (DAY_WEIGHTS[di] / dayWeightSum) * (hw / hourWeightSum);
      return Math.round(total * share);
    }),
  }));
}

export const HEATMAP_HOUR_LABELS = HOUR_BUCKET_LABELS;
