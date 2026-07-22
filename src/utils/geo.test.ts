import { describe, expect, it } from 'vitest';
import { haversineDistanceKm, nearestCameras } from './geo';
import type { Camera } from '../types';

const camera = (over: Partial<Camera> = {}): Camera => ({
  id: 'CAM-X', name: 'CAM-X', location: 'ทดสอบ', lat: 0, lng: 0,
  type: 'Fixed', organization: 'ทดสอบ', rtspUrl: '', status: 'Online',
  direction: 'ทิศเหนือ', lastUpdate: '', currentEvent: 'normal',
  lprMbps: 0, unityMbps: 0,
  ...over,
});

describe('haversineDistanceKm', () => {
  it('is zero for the same point', () => {
    expect(haversineDistanceKm({ lat: 13.36, lng: 100.98 }, { lat: 13.36, lng: 100.98 })).toBe(0);
  });

  it('matches the known ~111.2km for one degree of latitude at the equator', () => {
    const km = haversineDistanceKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(km).toBeCloseTo(111.19, 1);
  });

  it('matches the known ~111.2km for one degree of longitude at the equator', () => {
    const km = haversineDistanceKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
    expect(km).toBeCloseTo(111.19, 1);
  });
});

describe('nearestCameras', () => {
  const point = { lat: 13.36, lng: 100.98 };
  const cameras = [
    camera({ id: 'CAM-NEAR', lat: 13.3605, lng: 100.9805 }),   // ~70m away
    camera({ id: 'CAM-FAR', lat: 13.40, lng: 101.02 }),        // several km away
    camera({ id: 'CAM-MID', lat: 13.362, lng: 100.982 }),      // ~300m away
  ];

  it('filters out cameras beyond the radius', () => {
    const result = nearestCameras(point, cameras, 0.5);
    expect(result.map(c => c.id)).not.toContain('CAM-FAR');
  });

  it('sorts by distance, nearest first', () => {
    const result = nearestCameras(point, cameras, 0.5);
    expect(result.map(c => c.id)).toEqual(['CAM-NEAR', 'CAM-MID']);
  });

  it('includes a distanceKm field on each result', () => {
    const [first] = nearestCameras(point, cameras, 0.5);
    expect(first.distanceKm).toBeGreaterThan(0);
    expect(first.distanceKm).toBeLessThan(0.5);
  });
});
