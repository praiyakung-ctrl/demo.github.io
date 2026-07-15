/* Reports filed by staff when an offline camera needs inspection */

export interface CameraReport {
  cameraId: string;
  reportedBy: string;
  reportedAt: string;
}

const REPORTS_KEY = 'camera_reports';

export function savedReports(): CameraReport[] {
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function findReport(cameraId: string): CameraReport | null {
  return savedReports().find(r => r.cameraId === cameraId) ?? null;
}

export function saveReport(report: CameraReport): void {
  const others = savedReports().filter(r => r.cameraId !== report.cameraId);
  localStorage.setItem(REPORTS_KEY, JSON.stringify([...others, report]));
}
