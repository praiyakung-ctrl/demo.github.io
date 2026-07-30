import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import {
  Camera as CameraIcon, Compass, Link2, Check, Locate, Maximize,
  MapPin, Navigation, Search, Video, VideoOff, Wifi,
} from 'lucide-react';
import { SkipLink } from '../components/Layout';
import { Navbar } from '../components/Navbar';
import { CitizenFooter, CitizenHero, ServiceMenuChips, ServiceSidebar } from '../components/CitizenPortalUI';
import { LiveCameraModal } from '../components/LiveCameraModal';
import { CameraClusterMarkers } from '../components/CameraClusterMarkers';
import camerasData from '../data/cameras.json';
import type { Camera, CameraType } from '../types';
import { cameraImage, districtOf, overlayClock, downloadCameraSnapshot, copyCameraShareLink } from '../utils/cameraDisplay';
import { formatLastUpdate } from '../utils/formatDate';
import { nearestCameras } from '../utils/geo';
import { pinIcon, userLocationIcon } from '../utils/mapPin';

const publicCameras = (camerasData as Camera[]).filter(c => c.isPublic);
const MAP_CENTER: [number, number] = [13.22, 101.02];

type SortMode = 'near' | 'name' | 'status';

function markerColor(cam: Camera): string {
  return cam.status === 'Online' ? '#16A34A' : '#9CA3AF';
}

/* Hands the Leaflet map instance up to HomePage (via useMap(), only available
   inside <MapContainer>) so the overlay buttons outside it can call flyTo(). */
function MapInstanceCapture({ onReady }: { onReady: (map: LeafletMap) => void }) {
  const map = useMap();
  useEffect(() => { onReady(map); }, [map, onReady]);
  return null;
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Video; label: string; value: number; color: string }) {
  return (
    <div className="card flex items-center gap-3 py-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}22`, color }}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-lg text-gray-500 leading-tight">{label}</p>
        <p className="text-3xl font-extrabold leading-tight" style={{ color }}>{value} ตัว</p>
      </div>
    </div>
  );
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
        {online ? 'LIVE' : 'ออฟไลน์'}
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

function SelectedCameraPanel({ cam, onExpand }: { cam: Camera; onExpand: () => void }) {
  const [now, setNow] = useState(new Date());
  const [linkCopied, setLinkCopied] = useState(false);
  const online = cam.status === 'Online';

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const nearby = useMemo(() =>
    nearestCameras(cam, publicCameras.filter(c => c.id !== cam.id), 5).slice(0, 3),
    [cam]
  );

  const shareLink = async () => {
    if (await copyCameraShareLink(cam)) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-2xl font-bold text-navy-700 truncate">{cam.id}</h3>
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
              <span className="text-lg font-bold">กล้องออฟไลน์</span>
            </div>
          )}
        </div>

        <div className="p-3 grid grid-cols-3 gap-2">
          <button
            onClick={onExpand}
            className="flex flex-col items-center justify-center gap-1 border border-gray-200 rounded-xl px-2 py-2.5 text-navy-700 text-base font-bold hover:bg-navy-50 hover:border-navy-500 transition-colors"
          >
            <Maximize size={18} /> ภาพเต็มจอ
          </button>
          <button
            onClick={() => downloadCameraSnapshot(cam)}
            disabled={!online}
            className="flex flex-col items-center justify-center gap-1 border border-gray-200 rounded-xl px-2 py-2.5 text-navy-700 text-base font-bold hover:bg-navy-50 hover:border-navy-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CameraIcon size={18} /> บันทึกภาพ
          </button>
          <button
            onClick={shareLink}
            className={`flex flex-col items-center justify-center gap-1 border rounded-xl px-2 py-2.5 text-base font-bold transition-colors ${
              linkCopied ? 'border-red-300 bg-red-50 text-red-600' : 'border-gray-200 text-navy-700 hover:bg-navy-50 hover:border-navy-500'
            }`}
          >
            {linkCopied ? <Check size={18} /> : <Link2 size={18} />} {linkCopied ? 'คัดลอกแล้ว' : 'แชร์'}
          </button>
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
  const [typeFilter, setTypeFilter] = useState<'all' | CameraType>('all');
  const [sortMode, setSortMode] = useState<SortMode>('status');
  const [selectedId, setSelectedId] = useState<string | null>(
    publicCameras.find(c => c.status === 'Online')?.id ?? publicCameras[0]?.id ?? null
  );
  const [viewingCam, setViewingCam] = useState<Camera | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState(false);
  const [now, setNow] = useState(new Date());
  const [leafletMap, setLeafletMap] = useState<LeafletMap | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const online = publicCameras.filter(c => c.status === 'Online').length;

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

  const handleSortChange = (mode: SortMode) => {
    setSortMode(mode);
    if (mode === 'near' && !userPos) requestLocation();
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

  const filtered = useMemo(() => publicCameras.filter(c =>
    (search === '' || c.id.toLowerCase().includes(search.toLowerCase()) || c.location.includes(search)) &&
    (typeFilter === 'all' || c.type === typeFilter)
  ), [search, typeFilter]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sortMode === 'name') {
      return list.sort((a, b) => a.location.localeCompare(b.location, 'th'));
    }
    if (sortMode === 'near' && userPos) {
      const withDist = nearestCameras(userPos, list, 999999);
      return withDist;
    }
    // status: online first
    return list.sort((a, b) => (a.status === 'Online' ? 0 : 1) - (b.status === 'Online' ? 0 : 1));
  }, [filtered, sortMode, userPos]);

  const selectedCam = sorted.find(c => c.id === selectedId) ?? publicCameras.find(c => c.id === selectedId) ?? sorted[0] ?? null;

  const nearbyCount = useMemo(() =>
    userPos ? nearestCameras(userPos, publicCameras, 5).length : null,
    [userPos]
  );

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col">
      <SkipLink />
      <Navbar />
      <CitizenHero title="แผนที่กล้อง CCTV สาธารณะ">
        <p className="text-xl text-blue-100 max-w-xl">
          ดูตำแหน่งและภาพกล้องวงจรปิดจราจรแบบเรียลไทม์บนแผนที่จังหวัดชลบุรี เปิดให้บริการประชาชนทุกท่านโดยไม่ต้องเข้าสู่ระบบ
        </p>
      </CitizenHero>

      <div className="flex-1 w-full max-w-[1800px] mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-5 items-start">
        <div className="lg:hidden"><ServiceMenuChips active="home" /></div>
        <aside className="hidden lg:block">
          <ServiceSidebar active="home">
            <CameraListCard sorted={sorted} selectedCam={selectedCam} sortMode={sortMode} now={now} onSelect={setSelectedId} />
          </ServiceSidebar>
        </aside>

        <main id="main-content" tabIndex={-1} className="min-w-0 focus:outline-none space-y-5">
          {/* stat bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard icon={CameraIcon} label="กล้องทั้งหมด" value={publicCameras.length} color="#1B3A6B" />
            <StatCard icon={Wifi} label="ออนไลน์" value={online} color="#16A34A" />
            <StatCard icon={VideoOff} label="ออฟไลน์" value={publicCameras.length - online} color="#6B7280" />
          </div>

          {/* search + filters */}
          <div className="card p-4 flex flex-wrap gap-3 items-end">
            <div className="relative flex-1 min-w-[220px]">
              <label htmlFor="home-search" className="label">ค้นหากล้อง</label>
              <Search size={18} className="absolute left-3 top-[42px] text-gray-400" />
              <input
                id="home-search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อสถานที่หรือรหัสกล้อง..."
                className="input-field pl-9"
              />
            </div>
            <div>
              <label htmlFor="home-type" className="label">ประเภทกล้อง</label>
              <select id="home-type" value={typeFilter} onChange={e => setTypeFilter(e.target.value as 'all' | CameraType)} className="input-field w-auto">
                <option value="all">ทั้งหมด</option>
                <option value="Fixed">Fixed</option>
                <option value="PTZ">PTZ</option>
              </select>
            </div>
            <div>
              <label htmlFor="home-sort" className="label">เรียงตาม</label>
              <select id="home-sort" value={sortMode} onChange={e => handleSortChange(e.target.value as SortMode)} className="input-field w-auto">
                <option value="status">สถานะ</option>
                <option value="name">ชื่อ ก-ฮ</option>
                <option value="near">ใกล้ฉัน</option>
              </select>
            </div>
          </div>
          {geoError && (
            <p className="text-lg text-red-600 flex items-center gap-1.5 -mt-3">
              <Navigation size={16} /> ไม่สามารถเข้าถึงตำแหน่งของคุณได้ กรุณาอนุญาตการเข้าถึงตำแหน่งในเบราว์เซอร์
            </p>
          )}
          {!geoError && sortMode === 'near' && nearbyCount != null && (
            <p className="text-lg text-navy-700 flex items-center gap-1.5 -mt-3">
              <MapPin size={16} /> พบกล้อง {nearbyCount} ตัวในระยะ 5 กม. จากตำแหน่งของคุณ
            </p>
          )}

          {/* map + detail (camera list lives in the sidebar on desktop, see ServiceSidebar children) */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-4 items-start">
            {/* mobile-only: camera list (desktop shows it in the left sidebar instead) */}
            <div className="lg:hidden order-2">
              <CameraListCard sorted={sorted} selectedCam={selectedCam} sortMode={sortMode} now={now} onSelect={setSelectedId} />
            </div>

            {/* map */}
            <div className="card p-0 overflow-hidden order-1 relative" style={{ height: 640 }}>
              {/* on-map controls: locate me / search nearby cameras (paired with the zoom +/- control) */}
              <div className="absolute top-3 right-3 z-[500] flex flex-col gap-2">
                <button
                  onClick={handleLocateMe}
                  className="flex items-center gap-2 bg-white hover:bg-navy-50 text-navy-700 text-sm font-bold px-3 py-2 rounded-lg shadow-lg border border-gray-200 transition-colors"
                >
                  <Locate size={16} className="flex-shrink-0" /> ตำแหน่งของฉัน
                </button>
                <button
                  onClick={handleSearchNearby}
                  className="flex items-center gap-2 bg-white hover:bg-navy-50 text-navy-700 text-sm font-bold px-3 py-2 rounded-lg shadow-lg border border-gray-200 transition-colors"
                >
                  <Search size={16} className="flex-shrink-0" /> ค้นหากล้องใกล้ฉัน
                </button>
              </div>

              <MapContainer center={MAP_CENTER} zoom={11} className="w-full h-full" zoomControl={true}>
                <MapInstanceCapture onReady={setLeafletMap} />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {userPos && <Marker position={[userPos.lat, userPos.lng]} icon={userLocationIcon()} />}
                <CameraClusterMarkers cameras={filtered} renderMarker={cam => (
                  <Marker
                    key={cam.id}
                    position={[cam.lat, cam.lng]}
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
                            <p className="font-extrabold text-navy-700 text-lg leading-tight">{cam.id}</p>
                            <div className="flex items-center gap-1 text-gray-400 text-sm">
                              <Compass size={12} /> {cam.type} · {cam.direction}
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
                            <VideoOff size={16} /> กล้องออฟไลน์
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                )} />
              </MapContainer>
            </div>

            {/* right: selected camera detail */}
            <div className="order-3">
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
      <LiveCameraModal camera={viewingCam} onClose={() => setViewingCam(null)} hideCaptureControls={false} />
    </div>
  );
}
