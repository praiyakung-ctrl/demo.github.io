import { beforeEach, describe, expect, it } from 'vitest';
import { addRequest, findRequestByDownloadToken, generateDownloadToken, generateReqNo, savedRequests, updateRequest } from './requestStorage';
import type { CitizenRequest } from '../types';

const request = (over: Partial<CitizenRequest> = {}): CitizenRequest => ({
  id: 'req-1',
  reqNo: 'REQ-2569-0001',
  citizenName: 'ทดสอบ ระบบ',
  idCard: '3100100000009',
  phone: '0812345678',
  email: 'test@example.com',
  incidentLat: 13.36,
  incidentLng: 100.98,
  incidentLocation: 'ทดสอบสถานที่',
  assignedCameraIds: [],
  startDatetime: '2026-05-20T12:00:00',
  endDatetime: '2026-05-20T13:00:00',
  purpose: 'อุบัติเหตุ',
  description: 'ทดสอบ',
  status: 'ใหม่',
  submittedAt: '2026-05-20T10:15:00',
  timeline: [{ step: 'รับคำขอ', timestamp: '2026-05-20T10:15:00', completed: true }],
  ...over,
});

describe('requestStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('seeds from requests.json when storage is empty or invalid', () => {
    const seeded = savedRequests();
    expect(seeded.length).toBeGreaterThan(0);

    localStorage.setItem('citizen_requests', '{broken');
    expect(savedRequests()).toEqual(seeded);
  });

  it('addRequest appends and persists', () => {
    const before = savedRequests().length;
    addRequest(request());
    const after = savedRequests();
    expect(after).toHaveLength(before + 1);
    expect(after.find(r => r.id === 'req-1')?.citizenName).toBe('ทดสอบ ระบบ');
  });

  it('updateRequest patches only the matching request', () => {
    addRequest(request());
    addRequest(request({ id: 'req-2', reqNo: 'REQ-2569-0002' }));
    updateRequest('req-1', { status: 'ปฏิเสธ', rejectionReason: 'ไม่มีกล้องครอบคลุม' });
    const all = savedRequests();
    expect(all.find(r => r.id === 'req-1')?.status).toBe('ปฏิเสธ');
    expect(all.find(r => r.id === 'req-1')?.rejectionReason).toBe('ไม่มีกล้องครอบคลุม');
    expect(all.find(r => r.id === 'req-2')?.status).toBe('ใหม่');
  });

  it('generateReqNo produces REQ-YYMMDD-NNNN with today\'s date and a running number', () => {
    const now = new Date();
    const datePart = `${String(now.getFullYear() % 100).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

    const first = generateReqNo();
    expect(first).toBe(`REQ-${datePart}-0001`);

    addRequest(request({ id: 'req-today-1', reqNo: first }));
    const second = generateReqNo();
    expect(second).toBe(`REQ-${datePart}-0002`);

    addRequest(request({ id: 'req-today-2', reqNo: second }));
    const third = generateReqNo();
    expect(third).toBe(`REQ-${datePart}-0003`);
  });

  it('generateReqNo keeps the running number continuous across days within the same month', () => {
    const now = new Date();
    const yymm = `${String(now.getFullYear() % 100).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const todayDatePart = `${yymm}${String(now.getDate()).padStart(2, '0')}`;

    // an earlier request from a different day in the same month
    addRequest(request({ id: 'req-earlier-day', reqNo: `REQ-${yymm}01-0001` }));

    const next = generateReqNo();
    expect(next).toBe(`REQ-${todayDatePart}-0002`);
  });

  it('generateDownloadToken produces unique-looking tokens', () => {
    const a = generateDownloadToken();
    const b = generateDownloadToken();
    expect(a).toMatch(/^vt-/);
    expect(a).not.toBe(b);
  });

  it('findRequestByDownloadToken finds the matching request, or null', () => {
    addRequest(request({ id: 'req-token-1', downloadToken: 'vt-abc123' }));
    expect(findRequestByDownloadToken('vt-abc123')?.id).toBe('req-token-1');
    expect(findRequestByDownloadToken('vt-does-not-exist')).toBeNull();
  });
});
