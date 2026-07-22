import { describe, expect, it } from 'vitest';
import { clusterByProximity, haversineDistanceKm, nearestCameras } from './geo';
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

describe('clusterByProximity', () => {
  const p = (id: string, lat: number, lng: number) => ({ id, lat, lng });

  it('groups points within the radius into one cluster', () => {
    const items = [p('a', 13.36, 100.98), p('b', 13.3605, 100.9805), p('c', 13.3602, 100.9798)];
    const groups = clusterByProximity(items, 0.2);
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(3);
  });

  it('keeps points beyond the radius in separate clusters', () => {
    const items = [p('a', 13.36, 100.98), p('far', 13.50, 101.10)];
    const groups = clusterByProximity(items, 0.2);
    expect(groups).toHaveLength(2);
    expect(groups.map(g => g.items.length)).toEqual([1, 1]);
  });

  it('returns one group per point when the list is empty or singletons', () => {
    expect(clusterByProximity([])).toEqual([]);
    const groups = clusterByProximity([p('a', 13.36, 100.98)]);
    expect(groups).toHaveLength(1);
    expect(groups[0].items[0].id).toBe('a');
  });
});
