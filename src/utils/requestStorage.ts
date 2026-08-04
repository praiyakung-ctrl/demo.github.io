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

/* Case ID format: REQ-YYMMDD-NNNN (Christian-era date + monthly running number) */
export function generateReqNo(): string {
  const now = new Date();
  const yymm = `${String(now.getFullYear() % 100).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const datePart = `${yymm}${String(now.getDate()).padStart(2, '0')}`;
  const monthCount = savedRequests().filter(r => r.reqNo.startsWith(`REQ-${yymm}`)).length;
  return `REQ-${datePart}-${String(monthCount + 1).padStart(4, '0')}`;
}

/* Magic-link token for the "เข้าสู่ระบบอัตโนมัติ" video-ready email button.
   Client-side only, same trust model as the rest of this no-backend demo's
   mocked ThaID/Google/OTP flows — not a cryptographically signed credential. */
export function generateDownloadToken(): string {
  return `vt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function findRequestByDownloadToken(token: string): CitizenRequest | null {
  return savedRequests().find(r => r.downloadToken === token) ?? null;
}
