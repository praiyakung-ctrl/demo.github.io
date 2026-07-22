import { beforeEach, describe, expect, it } from 'vitest';
import { addRequest, savedRequests, updateRequest } from './requestStorage';
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
});
