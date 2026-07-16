/* Reports filed by staff when an offline camera needs inspection */

import repairsData from '../data/repairs.json';

export interface CameraReport {
  cameraId: string;
  reportedBy: string;
  reportedAt: string;
  note?: string;
  status: 'pending' | 'resolved';
  resolvedAt?: string;
}

const REPORTS_KEY = 'camera_reports';
const SEED = repairsData as CameraReport[];

/* Seeds sample repair history on first use (same pattern as userStorage) */
export function savedReports(): CameraReport[] {
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    if (!raw) return SEED;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED;
  } catch {
    return SEED;
  }
}

export function pendingReports(): CameraReport[] {
  return savedReports().filter(r => r.status === 'pending');
}

/* Only a pending report blocks re-reporting — once resolved the camera can be reported again */
export function findPendingReport(cameraId: string): CameraReport | null {
  return pendingReports().find(r => r.cameraId === cameraId) ?? null;
}

export function saveReport(report: CameraReport): void {
  const others = savedReports().filter(r => !(r.cameraId === report.cameraId && r.status === 'pending'));
  localStorage.setItem(REPORTS_KEY, JSON.stringify([...others, report]));
}

export function resolveReport(cameraId: string): void {
  const updated = savedReports().map(r =>
    r.cameraId === cameraId && r.status === 'pending'
      ? { ...r, status: 'resolved' as const, resolvedAt: new Date().toISOString() }
      : r
  );
  localStorage.setItem(REPORTS_KEY, JSON.stringify(updated));
}
