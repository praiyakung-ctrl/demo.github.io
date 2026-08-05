import type { Camera } from '../types';

/* Several cameras share the exact same lat/lng (multiple units on one pole/
   bridge) — 69 of 991 cameras across 17 groups. Rendered at identical
   coordinates their pins overlap 100% at any zoom, so clicking always hits
   whichever marker mounted last, never necessarily the intended camera.
   Spread each group's cameras onto a small deterministic circle so every
   camera gets its own clickable spot. */
const JITTER_RADIUS_DEG = 0.00008; // ~9m

export function computeDisplayPositions(cameras: Camera[]): Map<string, [number, number]> {
  const groups = new Map<string, Camera[]>();
  for (const cam of cameras) {
    const key = `${cam.lat},${cam.lng}`;
    const list = groups.get(key);
    if (list) list.push(cam); else groups.set(key, [cam]);
  }

  const positions = new Map<string, [number, number]>();
  for (const group of groups.values()) {
    if (group.length === 1) {
      const cam = group[0];
      positions.set(cam.id, [cam.lat, cam.lng]);
      continue;
    }
    const sorted = [...group].sort((a, b) => a.id.localeCompare(b.id));
    sorted.forEach((cam, i) => {
      const angle = (2 * Math.PI * i) / sorted.length;
      positions.set(cam.id, [
        cam.lat + JITTER_RADIUS_DEG * Math.sin(angle),
        cam.lng + JITTER_RADIUS_DEG * Math.cos(angle),
      ]);
    });
  }
  return positions;
}
