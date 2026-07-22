import incidentPointsData from '../data/incidentPoints.json';
import type { IncidentPoint } from '../types';

const INCIDENTS_KEY = 'incident_points';

/* Police risk points ("จุดเสี่ยงภัย") and local-officer proposed install points
   ("จุดขอติดตั้งใหม่"), persisted so submissions and staff review survive refresh.
   Seeds from incidentPoints.json on first use (or when storage is invalid). */
export function savedIncidentPoints(): IncidentPoint[] {
  try {
    const raw = localStorage.getItem(INCIDENTS_KEY);
    if (!raw) return incidentPointsData as IncidentPoint[];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : (incidentPointsData as IncidentPoint[]);
  } catch {
    return incidentPointsData as IncidentPoint[];
  }
}

export function saveIncidentPoints(points: IncidentPoint[]): void {
  localStorage.setItem(INCIDENTS_KEY, JSON.stringify(points));
}

/* police/localOfficer submission */
export function addIncidentPoint(point: IncidentPoint): void {
  saveIncidentPoints([...savedIncidentPoints(), point]);
}

/* staff review mutation by id */
export function updateIncidentPoint(id: string, patch: Partial<IncidentPoint>): void {
  saveIncidentPoints(savedIncidentPoints().map(p => (p.id === id ? { ...p, ...patch } : p)));
}

export function pendingIncidentPoints(): IncidentPoint[] {
  return savedIncidentPoints().filter(p => p.status === 'pending');
}

export function approvedIncidentPoints(): IncidentPoint[] {
  return savedIncidentPoints().filter(p => p.status === 'approved');
}
