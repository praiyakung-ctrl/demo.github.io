import { describe, expect, it } from 'vitest';
import { computeDisplayPositions } from './markerJitter';
import type { Camera } from '../types';

function cam(id: string, lat: number, lng: number): Camera {
  return { id, lat, lng } as Camera;
}

describe('computeDisplayPositions', () => {
  it('leaves a camera alone at its own coordinates', () => {
    const cameras = [cam('CAM-001', 13.1, 100.1)];
    const positions = computeDisplayPositions(cameras);
    expect(positions.get('CAM-001')).toEqual([13.1, 100.1]);
  });

  it('spreads cameras sharing identical coordinates onto distinct positions', () => {
    const cameras = [
      cam('CAM-009', 13.358417, 100.987028),
      cam('CAM-010', 13.358417, 100.987028),
      cam('CAM-011', 13.358417, 100.987028),
      cam('CAM-012', 13.358417, 100.987028),
    ];
    const positions = computeDisplayPositions(cameras);
    const values = cameras.map(c => positions.get(c.id));
    expect(values.every(v => v !== undefined)).toBe(true);

    const unique = new Set(values.map(v => v!.join(',')));
    expect(unique.size).toBe(4);
  });

  it('keeps jittered positions within the offset radius of the original coordinate', () => {
    const cameras = [
      cam('CAM-A', 13.358417, 100.987028),
      cam('CAM-B', 13.358417, 100.987028),
    ];
    const positions = computeDisplayPositions(cameras);
    for (const c of cameras) {
      const [lat, lng] = positions.get(c.id)!;
      const dist = Math.hypot(lat - c.lat, lng - c.lng);
      expect(dist).toBeGreaterThan(0);
      expect(dist).toBeLessThan(0.0001);
    }
  });

  it('is deterministic across repeated calls', () => {
    const cameras = [
      cam('CAM-009', 13.358417, 100.987028),
      cam('CAM-012', 13.358417, 100.987028),
    ];
    const first = computeDisplayPositions(cameras);
    const second = computeDisplayPositions(cameras);
    expect(first.get('CAM-009')).toEqual(second.get('CAM-009'));
    expect(first.get('CAM-012')).toEqual(second.get('CAM-012'));
  });
});
