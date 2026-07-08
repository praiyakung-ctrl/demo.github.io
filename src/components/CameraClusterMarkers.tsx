import { useState, type ReactNode } from 'react';
import { Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { Camera } from '../types';

/* Zoom-based clustering for the camera maps. Cameras install in tight groups
   (many per pole/bridge), so below the threshold we collapse each location
   into one numbered badge; clicking it zooms in to reveal individual pins. */

const clusterIconCache = new Map<number, L.DivIcon>();

function clusterIcon(count: number): L.DivIcon {
  let icon = clusterIconCache.get(count);
  if (!icon) {
    icon = L.divIcon({
      html: `<div style="
        width: 42px; height: 42px; border-radius: 9999px;
        background: #1B3A6B; color: #fff; border: 3px solid #fff;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        display: flex; align-items: center; justify-content: center;
        font-family: 'TH Sarabun New', sans-serif; font-size: 20px; font-weight: 700;
      ">${count}</div>`,
      className: '',
      iconSize: [42, 42],
      iconAnchor: [21, 21],
    });
    clusterIconCache.set(count, icon);
  }
  return icon;
}

interface ClusterGroup {
  location: string;
  lat: number;
  lng: number;
  cameras: Camera[];
}

function groupByLocation(cameras: Camera[]): ClusterGroup[] {
  const groups = new Map<string, Camera[]>();
  for (const cam of cameras) {
    const list = groups.get(cam.location);
    if (list) list.push(cam); else groups.set(cam.location, [cam]);
  }
  return [...groups.entries()].map(([location, cams]) => ({
    location,
    lat: cams.reduce((s, c) => s + c.lat, 0) / cams.length,
    lng: cams.reduce((s, c) => s + c.lng, 0) / cams.length,
    cameras: cams,
  }));
}

export function CameraClusterMarkers({ cameras, renderMarker, zoomThreshold = 13 }: {
  cameras: Camera[];
  renderMarker: (cam: Camera) => ReactNode;
  zoomThreshold?: number;
}) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  if (zoom >= zoomThreshold) {
    return <>{cameras.map(renderMarker)}</>;
  }

  return (
    <>
      {groupByLocation(cameras).map(group => (
        <Marker
          key={group.location}
          position={[group.lat, group.lng]}
          icon={clusterIcon(group.cameras.length)}
          title={`${group.location} (${group.cameras.length} กล้อง)`}
          eventHandlers={{
            click: () => map.flyTo([group.lat, group.lng], zoomThreshold + 2, { duration: 0.8 }),
          }}
        />
      ))}
    </>
  );
}
