import { beforeEach, describe, expect, it } from 'vitest';
import { findReport, savedReports, saveReport } from './cameraReports';

const report = { cameraId: 'CAM-004', reportedBy: 'สมศักดิ์ ผู้ดูแล', reportedAt: '2026-07-15T10:00:00.000Z' };

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

  it('saves a report and finds it by camera id', () => {
    saveReport(report);
    expect(findReport('CAM-004')?.reportedBy).toBe('สมศักดิ์ ผู้ดูแล');
  });

  it('returns null for a camera without a report', () => {
    saveReport(report);
    expect(findReport('CAM-001')).toBeNull();
  });

  it('overwrites an existing report for the same camera instead of duplicating', () => {
    saveReport(report);
    saveReport({ ...report, reportedAt: '2026-07-16T08:00:00.000Z' });
    expect(savedReports()).toHaveLength(1);
    expect(findReport('CAM-004')?.reportedAt).toBe('2026-07-16T08:00:00.000Z');
  });
});
