import L from 'leaflet';

/* teardrop map-pin SVG, shared by the map page markers, mini maps and legends */
export function pinSvg(color: string, width: number, height: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 24 32" style="filter: drop-shadow(0 2px 2px rgba(0,0,0,0.35))">
    <path d="M12 1C6 1 1.5 5.6 1.5 11.4 1.5 19.4 12 31 12 31s10.5-11.6 10.5-19.6C22.5 5.6 18 1 12 1z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
    <circle cx="12" cy="11.4" r="4.2" fill="#fff"/>
  </svg>`;
}

const pinIconCache = new Map<string, L.DivIcon>();

export function pinIcon(color: string, width = 20, height = 27): L.DivIcon {
  const key = `${color}-${width}x${height}`;
  let icon = pinIconCache.get(key);
  if (!icon) {
    icon = L.divIcon({
      html: pinSvg(color, width, height),
      className: '',
      iconSize: [width, height],
      iconAnchor: [width / 2, height - 1],
      popupAnchor: [0, -(height - 5)],
    });
    pinIconCache.set(key, icon);
  }
  return icon;
}

/* Numbered circle badge for a cluster of freeform pinned points at the same
   spot (e.g. "reported 3 times") — same visual language as the camera
   cluster badges (CameraClusterMarkers.tsx) but color-parameterized. */
const clusterCountIconCache = new Map<string, L.DivIcon>();

export function clusterCountIcon(count: number, color: string): L.DivIcon {
  const key = `${color}-${count}`;
  let icon = clusterCountIconCache.get(key);
  if (!icon) {
    icon = L.divIcon({
      html: `<div style="
        width: 38px; height: 38px; border-radius: 9999px;
        background: ${color}; color: #fff; border: 3px solid #fff;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        display: flex; align-items: center; justify-content: center;
        font-family: 'TH Sarabun New', sans-serif; font-size: 18px; font-weight: 700;
      ">${count}</div>`,
      className: '',
      iconSize: [38, 38],
      iconAnchor: [19, 19],
      popupAnchor: [0, -19],
    });
    clusterCountIconCache.set(key, icon);
  }
  return icon;
}
