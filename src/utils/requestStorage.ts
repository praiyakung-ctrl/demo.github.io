import requestsData from '../data/requests.json';
import type { CitizenRequest } from '../types';

const REQUESTS_KEY = 'citizen_requests';

/* Citizen CCTV-footage requests, persisted so submissions and staff review
   survive refresh. Seeds from requests.json on first use (or when storage is invalid). */
export function savedRequests(): CitizenRequest[] {
  try {
    const raw = localStorage.getItem(REQUESTS_KEY);
    if (!raw) return requestsData as CitizenRequest[];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : (requestsData as CitizenRequest[]);
  } catch {
    return requestsData as CitizenRequest[];
  }
}

export function saveRequests(requests: CitizenRequest[]): void {
  localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
}

/* citizen submission */
export function addRequest(req: CitizenRequest): void {
  saveRequests([...savedRequests(), req]);
}

/* staff/citizen mutation by id */
export function updateRequest(id: string, patch: Partial<CitizenRequest>): void {
  saveRequests(savedRequests().map(r => (r.id === id ? { ...r, ...patch } : r)));
}
