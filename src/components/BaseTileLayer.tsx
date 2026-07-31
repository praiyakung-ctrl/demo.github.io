import { TileLayer } from 'react-leaflet';
import { OSM_TILE, SATELLITE_TILE } from '../utils/mapTileLayers';

/* key forces Leaflet to unmount/remount the tile layer on switch, avoiding
   stale tiles from diffing the url template in place */
export function BaseTileLayer({ satellite }: { satellite: boolean }) {
  const tile = satellite ? SATELLITE_TILE : OSM_TILE;
  return <TileLayer key={satellite ? 'satellite' : 'osm'} url={tile.url} attribution={tile.attribution} />;
}
