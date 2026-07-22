import type { Camera } from '../types';

interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

export function haversineDistanceKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/* Cameras within maxKm of the point, nearest first — used to let staff pick
   which camera(s) cover a citizen's pinned incident location. */
export function nearestCameras(point: LatLng, cameras: Camera[], maxKm = 0.5): (Camera & { distanceKm: number })[] {
  return cameras
    .map(cam => ({ ...cam, distanceKm: haversineDistanceKm(point, { lat: cam.lat, lng: cam.lng }) }))
    .filter(cam => cam.distanceKm <= maxKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
