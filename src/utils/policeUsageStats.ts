import type { CitizenRequest, User } from '../types';
import { POLICE_STATION_AREA } from '../types';

export interface PoliceUsageRow {
  station: string;
  area: string;
  count: number;
  officers: number;
  totalMinutes: number;
  downloads: number;
  trendPct: number | null;
}

function monthKey(iso: string): string {
  return iso.slice(0, 7); // "YYYY-MM"
}

export function prevMonthKey(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 2, 1); // m is 1-based; -2 -> previous month
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function requestMinutes(r: CitizenRequest): number {
  const ms = new Date(r.endDatetime).getTime() - new Date(r.startDatetime).getTime();
  return ms > 0 ? ms / 60000 : 0;
}

/* Joins CCTV-viewing requests back to their submitter's police station via
   User.department (requests only carry `email`, not a station field). */
function policeRequestsWithStation(requests: CitizenRequest[], users: User[]) {
  const stationByEmail = new Map(
    users.filter(u => u.role === 'police' && u.department).map(u => [u.email, u.department as string])
  );
  return requests
    .map(r => ({ request: r, station: stationByEmail.get(r.email) }))
    .filter((x): x is { request: CitizenRequest; station: string } => !!x.station);
}

export function availableMonths(requests: CitizenRequest[], users: User[]): string[] {
  const months = new Set(policeRequestsWithStation(requests, users).map(x => monthKey(x.request.submittedAt)));
  return [...months].sort().reverse();
}

export function availablePurposes(requests: CitizenRequest[], users: User[]): string[] {
  const purposes = new Set(policeRequestsWithStation(requests, users).map(x => x.request.purpose));
  return [...purposes].sort();
}

export function policeUsageByStation(
  requests: CitizenRequest[],
  users: User[],
  month: string | 'all',
  purposeFilter: string | 'all'
): PoliceUsageRow[] {
  const joined = policeRequestsWithStation(requests, users)
    .filter(x => (month === 'all' || monthKey(x.request.submittedAt) === month))
    .filter(x => (purposeFilter === 'all' || x.request.purpose === purposeFilter));

  const prevMonth = month !== 'all' ? prevMonthKey(month) : null;
  const prevJoined = prevMonth
    ? policeRequestsWithStation(requests, users)
        .filter(x => monthKey(x.request.submittedAt) === prevMonth)
        .filter(x => (purposeFilter === 'all' || x.request.purpose === purposeFilter))
    : [];

  const stations = new Set(joined.map(x => x.station));

  const rows: PoliceUsageRow[] = [...stations].map(station => {
    const stationReqs = joined.filter(x => x.station === station).map(x => x.request);
    const count = stationReqs.length;
    const officers = new Set(stationReqs.map(r => r.email)).size;
    const totalMinutes = stationReqs.reduce((sum, r) => sum + requestMinutes(r), 0);
    const downloads = stationReqs.filter(r => !!r.videoFile).length;

    let trendPct: number | null = null;
    if (prevMonth) {
      const prevCount = prevJoined.filter(x => x.station === station).length;
      trendPct = prevCount > 0 ? ((count - prevCount) / prevCount) * 100 : (count > 0 ? 100 : 0);
    }

    return {
      station,
      area: POLICE_STATION_AREA[station] ?? '-',
      count,
      officers,
      totalMinutes,
      downloads,
      trendPct,
    };
  });

  return rows.sort((a, b) => b.count - a.count);
}

export function formatHoursMinutes(totalMinutes: number): string {
  const rounded = Math.round(totalMinutes);
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}
