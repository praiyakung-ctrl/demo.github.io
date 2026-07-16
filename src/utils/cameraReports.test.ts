import { beforeEach, describe, expect, it } from 'vitest';
import { findPendingReport, pendingReports, resolveReport, savedReports, saveReport } from './cameraReports';
import type { CameraReport } from './cameraReports';
import seed from '../data/repairs.json';

// CAM-004 has only a *resolved* seed entry, so it's free for fresh-report tests
const report: CameraReport = {
  cameraId: 'CAM-004',
  reportedBy: 'สมศักดิ์ ผู้ดูแล',
  reportedAt: '2026-07-16T10:00:00.000Z',
  note: 'ภาพไม่ขึ้น',
  status: 'pending',
};

describe('cameraReports', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('seeds sample history when storage is empty or invalid', () => {
    expect(savedReports()).toEqual(seed);
    localStorage.setItem('camera_reports', '{broken');
    expect(savedReports()).toEqual(seed);
  });

  it('seeded pending reports appear in pendingReports', () => {
    const pending = pendingReports();
    expect(pending.length).toBeGreaterThan(0);
    expect(pending.every(r => r.status === 'pending')).toBe(true);
    expect(findPendingReport('CAM-012')).not.toBeNull();
    expect(findPendingReport('CAM-004')).toBeNull(); // resolved-only in seed
  });

  it('saves a report with its note and finds it as pending', () => {
    saveReport(report);
    const found = findPendingReport('CAM-004');
    expect(found?.reportedBy).toBe('สมศักดิ์ ผู้ดูแล');
    expect(found?.note).toBe('ภาพไม่ขึ้น');
    expect(savedReports()).toHaveLength(seed.length + 1);
  });

  it('replaces an existing pending report for the same camera', () => {
    saveReport(report);
    saveReport({ ...report, note: 'ไฟไม่เข้า' });
    expect(savedReports()).toHaveLength(seed.length + 1);
    expect(findPendingReport('CAM-004')?.note).toBe('ไฟไม่เข้า');
  });

  it('resolveReport marks the pending report resolved with a timestamp', () => {
    saveReport(report);
    resolveReport('CAM-004');
    expect(findPendingReport('CAM-004')).toBeNull();
    const resolved = savedReports().filter(r => r.cameraId === 'CAM-004' && r.status === 'resolved');
    expect(resolved.length).toBeGreaterThanOrEqual(2); // seed entry + the one just resolved
    expect(resolved.every(r => r.resolvedAt)).toBe(true);
  });

  it('allows reporting again after the previous report was resolved', () => {
    saveReport(report);
    resolveReport('CAM-004');
    saveReport({ ...report, reportedAt: '2026-07-17T09:00:00.000Z' });
    expect(findPendingReport('CAM-004')).not.toBeNull();
    expect(savedReports()).toHaveLength(seed.length + 2); // resolved history is kept
  });
});
