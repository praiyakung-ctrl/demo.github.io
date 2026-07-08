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
