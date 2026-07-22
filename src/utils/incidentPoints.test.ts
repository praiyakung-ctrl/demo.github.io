import { beforeEach, describe, expect, it } from 'vitest';
import { addIncidentPoint, approvedIncidentPoints, pendingIncidentPoints, savedIncidentPoints, updateIncidentPoint } from './incidentPoints';
import type { IncidentPoint } from '../types';

const point = (over: Partial<IncidentPoint> = {}): IncidentPoint => ({
  id: 'IP-TEST-1',
  type: 'risk',
  lat: 13.36,
  lng: 100.98,
  locationLabel: 'ทดสอบสถานที่',
  category: 'อุบัติเหตุทางถนน',
  frequency: 'ครั้งแรก',
  description: 'ทดสอบ',
  submittedBy: 'ทดสอบ ตำรวจ',
  submittedByUserId: '11',
  submittedAt: '2026-07-01T08:00:00.000Z',
  status: 'pending',
  ...over,
});

describe('incidentPoints', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('seeds from incidentPoints.json when storage is empty or invalid', () => {
    const seeded = savedIncidentPoints();
    expect(seeded.length).toBeGreaterThan(0);

    localStorage.setItem('incident_points', '{broken');
    expect(savedIncidentPoints()).toEqual(seeded);
  });

  it('addIncidentPoint appends and persists', () => {
    const before = savedIncidentPoints().length;
    addIncidentPoint(point());
    const after = savedIncidentPoints();
    expect(after).toHaveLength(before + 1);
    expect(after.find(p => p.id === 'IP-TEST-1')?.locationLabel).toBe('ทดสอบสถานที่');
  });

  it('updateIncidentPoint patches only the matching point', () => {
    addIncidentPoint(point());
    addIncidentPoint(point({ id: 'IP-TEST-2' }));
    updateIncidentPoint('IP-TEST-1', { status: 'approved', reviewedBy: 'สมศักดิ์ ผู้ดูแล' });
    const all = savedIncidentPoints();
    expect(all.find(p => p.id === 'IP-TEST-1')?.status).toBe('approved');
    expect(all.find(p => p.id === 'IP-TEST-2')?.status).toBe('pending');
  });

  it('pendingIncidentPoints / approvedIncidentPoints filter by status', () => {
    addIncidentPoint(point({ id: 'IP-TEST-3', status: 'pending' }));
    addIncidentPoint(point({ id: 'IP-TEST-4', status: 'approved' }));
    expect(pendingIncidentPoints().some(p => p.id === 'IP-TEST-3')).toBe(true);
    expect(approvedIncidentPoints().some(p => p.id === 'IP-TEST-4')).toBe(true);
    expect(pendingIncidentPoints().some(p => p.id === 'IP-TEST-4')).toBe(false);
  });
});
