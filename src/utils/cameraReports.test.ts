import { beforeEach, describe, expect, it } from 'vitest';
import { findPendingReport, pendingReports, resolveReport, savedReports, saveReport } from './cameraReports';
import type { CameraReport } from './cameraReports';

const report: CameraReport = {
  cameraId: 'CAM-004',
  reportedBy: 'สมศักดิ์ ผู้ดูแล',
  reportedAt: '2026-07-15T10:00:00.000Z',
  note: 'ภาพไม่ขึ้น',
  status: 'pending',
};

describe('cameraReports', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns an empty list when nothing is stored', () => {
    expect(savedReports()).toEqual([]);
  });

  it('returns an empty list on invalid JSON', () => {
    localStorage.setItem('camera_reports', '{broken');
    expect(savedReports()).toEqual([]);
  });

  it('saves a report with its note and finds it as pending', () => {
    saveReport(report);
    const found = findPendingReport('CAM-004');
    expect(found?.reportedBy).toBe('สมศักดิ์ ผู้ดูแล');
    expect(found?.note).toBe('ภาพไม่ขึ้น');
  });

  it('returns null for a camera without a pending report', () => {
    saveReport(report);
    expect(findPendingReport('CAM-001')).toBeNull();
  });

  it('replaces an existing pending report for the same camera', () => {
    saveReport(report);
    saveReport({ ...report, note: 'ไฟไม่เข้า' });
    expect(pendingReports()).toHaveLength(1);
    expect(findPendingReport('CAM-004')?.note).toBe('ไฟไม่เข้า');
  });

  it('resolveReport marks the pending report resolved with a timestamp', () => {
    saveReport(report);
    resolveReport('CAM-004');
    expect(findPendingReport('CAM-004')).toBeNull();
    const all = savedReports();
    expect(all).toHaveLength(1);
    expect(all[0].status).toBe('resolved');
    expect(all[0].resolvedAt).toBeTruthy();
  });

  it('allows reporting again after the previous report was resolved', () => {
    saveReport(report);
    resolveReport('CAM-004');
    saveReport({ ...report, reportedAt: '2026-07-16T09:00:00.000Z' });
    expect(pendingReports()).toHaveLength(1);
    expect(savedReports()).toHaveLength(2); // resolved history is kept
  });
});
