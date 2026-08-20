import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, useMap } from 'react-leaflet';
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';
import {
  Camera as CameraIcon, Compass, Eye, EyeOff, HelpCircle, Locate, Maximize,
  MapPin, Navigation, Navigation2, RotateCcw, Search, Share2, Video, VideoOff, Wifi, Wrench,
} from 'lucide-react';
import { SkipLink } from '../components/Layout';
import { Navbar } from '../components/Navbar';
import { CitizenFooter, ServiceMenuChips, ServiceSidebar } from '../components/CitizenPortalUI';
import { LiveCameraModal } from '../components/LiveCameraModal';
import { CameraClusterMarkers } from '../components/CameraClusterMarkers';
import { BaseTileLayer } from '../components/BaseTileLayer';
import { SatelliteToggleButton } from '../components/SatelliteToggleButton';
import { MapFabMenu } from '../components/MapFabMenu';
import { LprBadge } from '../components/LprBadge';
import camerasData from '../data/cameras.json';
import type { Camera, CameraStatus } from '../types';
import { STATUS_COLORS, STATUS_LABELS } from '../types';
import { cameraImage, copyCameraShareLink, districtOf, overlayClock } from '../utils/cameraDisplay';
import { formatLastUpdate } from '../utils/formatDate';
import { nearestCameras } from '../utils/geo';
import { pinIcon, userLocationIcon } from '../utils/mapPin';
import { computeDisplayPositions } from '../utils/markerJitter';

const publicCameras = (camerasData as Camera[]).filter(c => c.isPublic);
const MAP_CENTER: [number, number] = [13.22, 101.02];
const displayPositions = computeDisplayPositions(publicCameras);

const STATUS_SORT_ORDER: CameraStatus[] = ['Online', 'Maintenance', 'Unknown', 'Offline'];

const STATUS_COUNTS: Record<CameraStatus, number> = { Online: 0, Offline: 0, Maintenance: 0, Unknown: 0 };
publicCameras.forEach(c => { STATUS_COUNTS[c.status]++; });

const LOCATION_SUGGESTIONS = [...new Set(publicCameras.map(c => c.location))].sort((a, b) => a.localeCompare(b, 'th'));

type SortMode = 'near' | 'name' | 'status';

function markerColor(cam: Camera): string {
  return STATUS_COLORS[cam.status];
}

/* Hands the Leaflet map instance up to HomePage (via useMap(), only available
   inside <MapContainer>) so the overlay buttons outside it can call flyTo(). */
function MapInstanceCapture({ onReady }: { onReady: (map: LeafletMap) => void }) {
  const map = useMap();
  useEffect(() => { onReady(map); }, [map, onReady]);
  return null;
}

function CameraListItem({ cam, active, distanceKm, onSelect }: { cam: Camera; active: boolean; distanceKm?: number; onSelect: () => void }) {
  const online = cam.status === 'Online';
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-3 py-2.5 rounded-lg border-2 transition-colors ${
        active ? 'border-navy-700 bg-navy-50' : 'border-transparent hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-2">
        <CameraIcon size={18} className="flex-shrink-0" style={{ color: markerColor(cam) }} />
        <p className="min-w-0 flex-1 text-navy-700 text-lg font-bold truncate">{cam.id}</p>
        {distanceKm != null && (
          <span className="text-sm text-gray-400 flex-shrink-0">{distanceKm.toFixed(1)} กม.</span>
        )}
      </div>
      <p className="text-base text-gray-600 truncate ml-[26px]">{cam.location}</p>
      <p className="text-base ml-[26px] flex items-center gap-1 font-bold" style={{ color: markerColor(cam) }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: markerColor(cam) }} />
        {online ? 'LIVE' : STATUS_LABELS[cam.status]}
      </p>
    </button>
  );
}

function CameraListCard({ sorted, selectedCam, sortMode, now, onSelect }: {
  sorted: Camera[];
  selectedCam: Camera | null;
  sortMode: SortMode;
  now: Date;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-xl font-bold text-navy-700">
          รายการกล้องทั้งหมด <span className="text-navy-500">{sorted.length}</span>
        </h2>
        <p className="text-base text-gray-400">อัปเดตล่าสุด {overlayClock(now).split(' ')[1]}</p>
      </div>
      <div className="max-h-[420px] overflow-y-auto p-2 space-y-1">
        {sorted.length === 0 ? (
          <p className="text-lg text-gray-400 text-center py-8">ไม่พบกล้องที่ค้นหา</p>
        ) : sorted.map(cam => (
          <CameraListItem
            key={cam.id}
            cam={cam}
            active={cam.id === selectedCam?.id}
            distanceKm={sortMode === 'near' && 'distanceKm' in cam ? (cam as Camera & { distanceKm: number }).distanceKm : undefined}
            onSelect={() => onSelect(cam.id)}
          />
        ))}
      </div>
    </div>
  );
}

function CameraStatusSummaryCard() {
  return (
    <div className="card p-3">
      <div className="grid grid-cols-5 gap-2 text-center">
        <div>
          <p className="text-2xl font-extrabold text-navy-700 leading-tight">{publicCameras.length}</p>
          <p className="text-sm text-gray-500 flex items-center justify-center gap-1"><CameraIcon size={12} /> ทั้งหมด</p>
        </div>
        <div>
          <p className="text-2xl font-extrabold leading-tight" style={{ color: STATUS_COLORS.Online }}>{STATUS_COUNTS.Online}</p>
          <p className="text-sm text-gray-500 flex items-center justify-center gap-1"><Wifi size={12} /> ออนไลน์</p>
        </div>
        <div>
          <p className="text-2xl font-extrabold leading-tight" style={{ color: STATUS_COLORS.Offline }}>{STATUS_COUNTS.Offline}</p>
          <p className="text-sm text-gray-500 flex items-center justify-center gap-1"><VideoOff size={12} /> ออฟไลน์</p>
        </div>
        <div>
          <p className="text-2xl font-extrabold leading-tight" style={{ color: STATUS_COLORS.Maintenance }}>{STATUS_COUNTS.Maintenance}</p>
          <p className="text-sm text-gray-500 flex items-center justify-center gap-1"><Wrench size={12} /> ซ่อมบำรุง</p>
        </div>
        <div>
          <p className="text-2xl font-extrabold leading-tight" style={{ color: STATUS_COLORS.Unknown }}>{STATUS_COUNTS.Unknown}</p>
          <p className="text-sm text-gray-500 flex items-center justify-center gap-1"><HelpCircle size={12} /> ไม่ทราบ</p>
        </div>
      </div>
    </div>
  );
}

function SelectedCameraPanel({ cam, onExpand }: { cam: Camera; onExpand: () => void }) {
  const [now, setNow] = useState(new Date());
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'error'>('idle');
  const online = cam.status === 'Online';

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleShare = async () => {
    const ok = await copyCameraShareLink(cam);
    setShareState(ok ? 'copied' : 'error');
    setTimeout(() => setShareState('idle'), 2000);
  };
  const navigateUrl = `https://www.google.com/maps/search/?api=1&query=${cam.lat},${cam.lng}`;

  const nearby = useMemo(() =>
    nearestCameras(cam, publicCameras.filter(c => c.id !== cam.id), 5).slice(0, 3),
    [cam]
  );

  return (
    <div className="space-y-4">
      <CameraStatusSummaryCard />

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-2xl font-bold text-navy-700 truncate">{cam.id}</h3>
            {cam.isLpr && <LprBadge className="flex-shrink-0" />}
          </div>
          {online && (
            <span className="flex items-center gap-1.5 text-base font-bold text-green-600 flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> LIVE
            </span>
          )}
        </div>
        <div className="px-4 py-2 border-b border-gray-100">
          <p className="text-xl font-bold text-gray-800">{cam.location}</p>
          <p className="text-lg text-gray-500 flex items-center gap-1">
            <MapPin size={16} className="flex-shrink-0" /> {districtOf(cam.location)}
          </p>
        </div>

        <div className="relative aspect-video bg-gray-900">
          {online ? (
            <>
              <img
                src={cameraImage(cam)}
                alt={cam.location}
                className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <span className="absolute top-2 left-2 bg-black/50 text-white text-sm font-mono px-2 py-0.5 rounded">
                {overlayClock(now)}
              </span>
              <span className="absolute top-2 right-2 flex items-center gap-1.5 bg-red-600 text-white text-sm font-bold px-2.5 py-1 rounded-lg">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" /> LIVE
              </span>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-2">
              <VideoOff size={36} />
              <span className="text-lg font-bold">{STATUS_LABELS[cam.status]}</span>
            </div>
          )}
        </div>

        <div className="p-3 grid grid-cols-3 gap-2">
          <button
            onClick={onExpand}
            className="flex items-center justify-center gap-1 border border-gray-200 rounded-xl px-2 py-2.5 text-navy-700 text-base font-bold hover:bg-navy-50 hover:border-navy-500 transition-colors"
          >
            <Maximize size={18} /> ภาพเต็มจอ
          </button>
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-1 border border-gray-200 rounded-xl px-2 py-2.5 text-navy-700 text-base font-bold hover:bg-navy-50 hover:border-navy-500 transition-colors"
          >
            <Share2 size={18} /> {shareState === 'copied' ? 'คัดลอกแล้ว' : shareState === 'error' ? 'คัดลอกไม่ได้' : 'แชร์'}
          </button>
          <a
            href={navigateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 border border-gray-200 rounded-xl px-2 py-2.5 text-navy-700 text-base font-bold hover:bg-navy-50 hover:border-navy-500 transition-colors"
          >
            <Navigation2 size={18} /> นำทาง
          </a>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <h3 className="text-xl font-bold text-navy-700 px-4 py-3 border-b border-gray-100">กล้องใกล้เคียง</h3>
        {nearby.length === 0 ? (
          <p className="text-lg text-gray-400 text-center py-4">ไม่พบกล้องในบริเวณใกล้เคียง</p>
        ) : (
          <div>
            {nearby.map(n => (
              <div key={n.id} className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 last:border-0">
                <div className="min-w-0">
                  <p className="text-lg font-bold text-navy-700 truncate">{n.id}</p>
                  <p className="text-base text-gray-500 truncate">{n.location}</p>
                </div>
                <span className="text-base text-gray-400 flex-shrink-0 ml-2">{n.distanceKm.toFixed(1)} กม.</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function HomePage() {
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('status');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [legendVisible, setLegendVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(
    publicCameras.find(c => c.status === 'Online')?.id ?? publicCameras[0]?.id ?? null
  );
  const [viewingCam, setViewingCam] = useState<Camera | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState(false);
  const [now, setNow] = useState(new Date());
  const [leafletMap, setLeafletMap] = useState<LeafletMap | null>(null);
  const [satellite, setSatellite] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const markerRefs = useRef<Map<string, LeafletMarker>>(new Map());
  const asideRef = useRef<HTMLElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const [mapHeight, setMapHeight] = useState(640);

  /* closes the search-suggestions dropdown on outside click — same
     composedPath() pattern as MapFabMenu (see that file for why e.target
     is unreliable here) so clicking a suggestion doesn't self-close before
     its own onClick runs */
  useEffect(() => {
    if (!showSuggestions) return;
    const onDocClick = (e: MouseEvent) => {
      if (searchWrapRef.current && e.composedPath().includes(searchWrapRef.current)) return;
      setShowSuggestions(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [showSuggestions]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  /* keeps the map's bottom edge aligned with whichever side column is taller —
     the left sidebar ("ต้องการความช่วยเหลือ?" box) or the right detail panel
     ("กล้องใกล้เคียง" card) — both are content-driven, so they're measured rather than assumed */
  useLayoutEffect(() => {
    const recalc = () => {
      if (window.innerWidth < 1024 || !mapWrapperRef.current) return;
      const mapTop = mapWrapperRef.current.getBoundingClientRect().top;
      const asideBottom = asideRef.current?.getBoundingClientRect().bottom ?? 0;
      const rightPanelBottom = rightPanelRef.current?.getBoundingClientRect().bottom ?? 0;
      const bottom = Math.max(asideBottom, rightPanelBottom);
      if (bottom === 0) return;
      setMapHeight(Math.max(420, Math.round(bottom - mapTop)));
    };
    recalc();
    const observer = new ResizeObserver(recalc);
    if (asideRef.current) observer.observe(asideRef.current);
    if (rightPanelRef.current) observer.observe(rightPanelRef.current);
    window.addEventListener('resize', recalc);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', recalc);
    };
  }, []);

  /* Leaflet caches its container size — must be told to re-measure whenever the map
     wrapper's box changes (e.g. sidebar collapse toggling the grid column width),
     otherwise tiles/markers render at stale positions. */
  useEffect(() => {
    if (!mapWrapperRef.current || !leafletMap) return;
    const observer = new ResizeObserver(() => leafletMap.invalidateSize());
    observer.observe(mapWrapperRef.current);
    return () => observer.disconnect();
  }, [leafletMap]);

  /* shared geolocation getter — used by the "เรียงตาม: ใกล้ฉัน" dropdown and
     by the map's "ตำแหน่งของฉัน" / "ค้นหากล้องใกล้ฉัน" buttons */
  const requestLocation = (onSuccess?: (pos: { lat: number; lng: number }) => void) => {
    if (!navigator.geolocation) { setGeoError(true); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(next);
        setGeoError(false);
        onSuccess?.(next);
      },
      () => setGeoError(true)
    );
  };

  const handleLocateMe = () => {
    requestLocation(pos => leafletMap?.flyTo([pos.lat, pos.lng], 15, { duration: 0.8 }));
  };

  const handleSearchNearby = () => {
    requestLocation(pos => {
      leafletMap?.flyTo([pos.lat, pos.lng], 13, { duration: 0.8 });
      setSortMode('near');
    });
  };

  const placeSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return LOCATION_SUGGESTIONS.filter(loc => loc.toLowerCase().includes(q)).slice(0, 5);
  }, [search]);

  const cameraSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return publicCameras.filter(c => c.id.toLowerCase().includes(q) || c.location.toLowerCase().includes(q)).slice(0, 5);
  }, [search]);

  const filtered = useMemo(() => publicCameras.filter(c =>
    search === '' || c.id.toLowerCase().includes(search.toLowerCase()) || c.location.includes(search)
  ), [search]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sortMode === 'name') {
      return list.sort((a, b) => a.location.localeCompare(b.location, 'th'));
    }
    if (sortMode === 'near' && userPos) {
      const withDist = nearestCameras(userPos, list, 999999);
      return withDist;
    }
    // status: online first, then maintenance, unknown, offline
    return list.sort((a, b) => STATUS_SORT_ORDER.indexOf(a.status) - STATUS_SORT_ORDER.indexOf(b.status));
  }, [filtered, sortMode, userPos]);

  const selectedCam = sorted.find(c => c.id === selectedId) ?? publicCameras.find(c => c.id === selectedId) ?? sorted[0] ?? null;

  const nearbyCount = useMemo(() =>
    userPos ? nearestCameras(userPos, publicCameras, 5).length : null,
    [userPos]
  );

  const handleSelectCamera = (id: string) => {
    setSelectedId(id);
    const cam = sorted.find(c => c.id === id) ?? publicCameras.find(c => c.id === id);
    if (!cam || !leafletMap) return;
    const pos = displayPositions.get(cam.id) ?? [cam.lat, cam.lng];
    leafletMap.flyTo(pos, 18, { duration: 0.8 });
    leafletMap.once('moveend', () => {
      setTimeout(() => markerRefs.current.get(cam.id)?.openPopup(), 50);
    });
  };

  const handleResetView = () => {
    leafletMap?.flyTo(MAP_CENTER, 11, { duration: 0.8 });
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col">
      <SkipLink />
      <Navbar />
      {/* visually hidden — the compact layout has no visible page title, but the page still
          needs exactly one <h1> for screen readers/document structure */}
      <h1 className="sr-only">แผนที่กล้อง CCTV สาธารณะ</h1>

      <div className={`flex-1 w-full max-w-[1800px] mx-auto px-4 py-6 grid grid-cols-1 gap-5 items-start ${sidebarCollapsed ? 'lg:grid-cols-[64px_minmax(0,1fr)]' : 'lg:grid-cols-[280px_minmax(0,1fr)]'}`}>
        <div className="lg:hidden"><ServiceMenuChips active="home" /></div>
        <aside ref={asideRef} className="hidden lg:block">
          <ServiceSidebar active="home" collapsible collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed}>
            <CameraListCard sorted={sorted} selectedCam={selectedCam} sortMode={sortMode} now={now} onSelect={handleSelectCamera} />
          </ServiceSidebar>
        </aside>

        <main id="main-content" tabIndex={-1} className="min-w-0 focus:outline-none space-y-5">
          {/* central search: type-ahead over locations + cameras, no extra clicks needed */}
          <div ref={searchWrapRef} className="relative">
            <div className="card p-2 flex items-center gap-2">
              <Search size={20} className="ml-2 text-gray-400 flex-shrink-0" />
              <input
                id="home-search"
                value={search}
                onChange={e => { setSearch(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="ค้นหาสถานที่ ถนน หมู่บ้าน หรือกล้อง"
                autoComplete="off"
                aria-label="ค้นหาสถานที่ ถนน หมู่บ้าน หรือกล้อง"
                className="flex-1 min-w-0 border-0 focus:ring-0 text-xl py-2 bg-transparent"
              />
            </div>
            {showSuggestions && search.trim() !== '' && (
              <div className="absolute z-[600] top-full left-0 right-0 mt-1 card p-0 overflow-hidden shadow-2xl grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                <div className="max-h-72 overflow-y-auto">
                  <p className="px-4 py-2 text-base font-bold text-gray-500 bg-gray-50 sticky top-0">แนะนำสถานที่</p>
                  {placeSuggestions.length === 0 ? (
                    <p className="px-4 py-4 text-lg text-gray-400">ไม่พบผลลัพธ์</p>
                  ) : placeSuggestions.map(loc => (
                    <button
                      key={loc}
                      onClick={() => { setSearch(loc); setShowSuggestions(false); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-navy-50 flex items-center gap-2"
                    >
                      <MapPin size={16} className="text-navy-500 flex-shrink-0" />
                      <span className="text-lg text-gray-800 truncate">{loc}</span>
                    </button>
                  ))}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  <p className="px-4 py-2 text-base font-bold text-gray-500 bg-gray-50 sticky top-0">กล้อง CCTV</p>
                  {cameraSuggestions.length === 0 ? (
                    <p className="px-4 py-4 text-lg text-gray-400">ไม่พบผลลัพธ์</p>
                  ) : cameraSuggestions.map(cam => (
                    <button
                      key={cam.id}
                      onClick={() => { handleSelectCamera(cam.id); setSearch(''); setShowSuggestions(false); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-navy-50 flex items-center gap-2"
                    >
                      <CameraIcon size={16} className="flex-shrink-0" style={{ color: markerColor(cam) }} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-lg font-bold text-navy-700 truncate">{cam.id} <span className="font-normal text-gray-600">{cam.location}</span></span>
                      </span>
                      <span className="text-sm font-bold flex-shrink-0" style={{ color: markerColor(cam) }}>
                        {cam.status === 'Online' ? 'ออนไลน์' : STATUS_LABELS[cam.status]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {geoError && (
            <p className="text-lg text-red-600 flex items-center gap-1.5">
              <Navigation size={16} /> ไม่สามารถเข้าถึงตำแหน่งของคุณได้ กรุณาอนุญาตการเข้าถึงตำแหน่งในเบราว์เซอร์
            </p>
          )}
          {!geoError && sortMode === 'near' && nearbyCount != null && (
            <p className="text-lg text-navy-700 flex items-center gap-1.5">
              <MapPin size={16} /> พบกล้อง {nearbyCount} ตัวในระยะ 5 กม. จากตำแหน่งของคุณ
            </p>
          )}

          {/* map + detail (camera list lives in the sidebar on desktop, see ServiceSidebar children) */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start">
            {/* mobile-only: camera list (desktop shows it in the left sidebar instead) */}
            <div className="lg:hidden order-2">
              <CameraListCard sorted={sorted} selectedCam={selectedCam} sortMode={sortMode} now={now} onSelect={handleSelectCamera} />
            </div>

            {/* map */}
            <div ref={mapWrapperRef} className="card p-0 overflow-hidden order-1 relative" style={{ height: mapHeight }}>
              {/* locate-me: small circular button paired just under the Leaflet zoom control (top-left) */}
              <div className="absolute top-20 left-3 z-[500] group">
                <button
                  onClick={handleLocateMe}
                  aria-label="ตำแหน่งของฉัน"
                  title="ตำแหน่งของฉัน"
                  className="w-9 h-9 flex items-center justify-center bg-white hover:bg-navy-50 text-navy-700 rounded-lg shadow-lg border border-gray-200 transition-colors"
                >
                  <Locate size={18} />
                </button>
                <span className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  ตำแหน่งของฉัน
                </span>
              </div>

              {/* status legend (bottom-left, clear of Leaflet's default bottom-right attribution) — can be hidden */}
              <div className="absolute bottom-3 left-3 z-[500] pointer-events-none">
                {legendVisible ? (
                  <div className="pointer-events-auto bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 px-3 py-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-bold text-gray-700">
                    <span className="text-gray-500">สถานะกล้อง:</span>
                    {(['Online', 'Offline', 'Maintenance', 'Unknown'] as CameraStatus[]).map(s => (
                      <span key={s} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[s] }} />
                        {STATUS_LABELS[s]}
                      </span>
                    ))}
                    <button
                      onClick={() => setLegendVisible(false)}
                      aria-label="ซ่อนสถานะกล้อง"
                      title="ซ่อนสถานะกล้อง"
                      className="pointer-events-auto text-gray-400 hover:text-gray-600 flex-shrink-0"
                    >
                      <EyeOff size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setLegendVisible(true)}
                    aria-label="แสดงสถานะกล้อง"
                    title="แสดงสถานะกล้อง"
                    className="pointer-events-auto flex items-center gap-1.5 bg-white/95 backdrop-blur-sm hover:bg-navy-50 text-navy-700 text-sm font-bold px-3 py-1.5 rounded-lg shadow-lg border border-gray-200 transition-colors"
                  >
                    <Eye size={16} /> สถานะกล้อง
                  </button>
                )}
              </div>

              <MapContainer center={MAP_CENTER} zoom={11} className="w-full h-full" zoomControl={true}>
                <MapInstanceCapture onReady={setLeafletMap} />
                <BaseTileLayer satellite={satellite} />
                {userPos && <Marker position={[userPos.lat, userPos.lng]} icon={userLocationIcon()} />}
                <CameraClusterMarkers cameras={filtered} renderMarker={cam => (
                  <Marker
                    key={cam.id}
                    ref={m => { if (m) markerRefs.current.set(cam.id, m); else markerRefs.current.delete(cam.id); }}
                    position={displayPositions.get(cam.id) ?? [cam.lat, cam.lng]}
                    icon={pinIcon(markerColor(cam))}
                    title={`${cam.id} ${cam.location}`}
                    alt={`กล้อง ${cam.id} ${cam.location}`}
                    keyboard={true}
                    eventHandlers={{ click: () => setSelectedId(cam.id) }}
                  >
                    <Popup minWidth={220}>
                      <div style={{ fontFamily: "'TH Sarabun New', sans-serif", minWidth: 220 }}>
                        <div className="flex items-center gap-2 mb-2">
                          <CameraIcon size={20} style={{ color: markerColor(cam) }} />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-extrabold text-navy-700 text-lg leading-tight">{cam.id}</p>
                              {cam.isLpr && <LprBadge />}
                            </div>
                            <div className="flex items-center gap-1 text-gray-400 text-sm">
                              <Compass size={12} /> {cam.type} · {cam.lat.toFixed(4)}, {cam.lng.toFixed(4)}
                            </div>
                          </div>
                        </div>
                        <p className="text-base font-bold text-gray-800 mb-2">{cam.location}</p>
                        <p className="text-sm text-gray-400 mb-2">
                          อัปเดต: {cam.lastUpdate ? formatLastUpdate(cam.lastUpdate) : '—'}
                        </p>
                        {cam.status === 'Online' ? (
                          <button
                            onClick={() => setViewingCam(cam)}
                            className="w-full bg-navy-700 hover:bg-navy-600 text-white text-base font-bold py-2 rounded-lg flex items-center justify-center gap-2"
                          >
                            <Video size={16} /> ดู Live
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 bg-gray-100 text-gray-600 text-sm font-bold px-3 py-2 rounded-lg">
                            <VideoOff size={16} /> {STATUS_LABELS[cam.status]}
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                )} />
              </MapContainer>
              <MapFabMenu>
                <button
                  onClick={handleSearchNearby}
                  className="flex items-center gap-2 bg-white hover:bg-navy-50 text-navy-700 text-sm font-bold px-3 py-2 rounded-lg shadow-lg border border-gray-200 transition-colors"
                >
                  <Search size={16} className="flex-shrink-0" /> ค้นหากล้องใกล้ฉัน
                </button>
                <button
                  onClick={handleResetView}
                  className="flex items-center gap-2 bg-white hover:bg-navy-50 text-navy-700 text-sm font-bold px-3 py-2 rounded-lg shadow-lg border border-gray-200 transition-colors"
                >
                  <RotateCcw size={16} className="flex-shrink-0" /> รีเซ็ตมุมมองแผนที่
                </button>
                <SatelliteToggleButton satellite={satellite} onToggle={() => setSatellite(s => !s)} className="" />
              </MapFabMenu>
            </div>

            {/* right: selected camera detail */}
            <div ref={rightPanelRef} className="order-3">
              {selectedCam ? (
                <SelectedCameraPanel cam={selectedCam} onExpand={() => setViewingCam(selectedCam)} />
              ) : (
                <div className="card text-center py-10 text-gray-400">
                  <VideoOff size={40} className="mx-auto mb-2 opacity-40" />
                  <p className="text-xl">ไม่พบกล้องที่เลือก</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <CitizenFooter />
      <LiveCameraModal camera={viewingCam} onClose={() => setViewingCam(null)} />
    </div>
  );
}
