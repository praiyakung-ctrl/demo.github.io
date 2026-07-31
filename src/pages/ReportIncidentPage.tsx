import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import {
  AlertTriangle, Camera as CameraIcon, Eye, EyeOff, FileSpreadsheet, Locate, MapPin, Plus,
  RotateCcw, ShieldAlert, Upload, Video, VideoOff, Wifi, Wrench, X,
} from 'lucide-react';
import { SkipLink } from '../components/Layout';
import { Navbar } from '../components/Navbar';
import { CitizenFooter, ServiceMenuChips, ServiceSidebar } from '../components/CitizenPortalUI';
import { CameraClusterMarkers } from '../components/CameraClusterMarkers';
import { LiveCameraModal } from '../components/LiveCameraModal';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import camerasData from '../data/cameras.json';
import type { Camera, CameraStatus, IncidentPoint, IncidentPointType } from '../types';
import { INCIDENT_CATEGORY_OPTIONS, INCIDENT_FREQUENCY_OPTIONS, INCIDENT_STATUS_LABEL, STATUS_COLORS, STATUS_LABELS } from '../types';
import { formatThaiDate, formatThaiDateTime } from '../utils/formatDate';
import { addIncidentPoint, savedIncidentPoints } from '../utils/incidentPoints';
import { logAudit } from '../utils/auditLog';
import { exportRowsToExcel, todayStamp } from '../utils/exportReport';
import { clusterByProximity } from '../utils/geo';
import { clusterCountIcon, pinIcon, userLocationIcon } from '../utils/mapPin';
import { districtOf } from '../utils/cameraDisplay';
import { Link } from 'react-router-dom';

const MAP_CENTER: [number, number] = [13.36, 100.98];
const POINT_COLORS = { risk: '#EF4444', proposed: '#EAB308' } as const;

function StatCard({ icon: Icon, label, value, color, unit = 'จุด' }: { icon: typeof ShieldAlert; label: string; value: number; color: string; unit?: string }) {
  return (
    <div className="card flex items-center gap-3 py-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}22`, color }}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-lg text-gray-500 leading-tight">{label}</p>
        <p className="text-3xl font-extrabold leading-tight" style={{ color }}>{value} {unit}</p>
      </div>
    </div>
  );
}

const allCameras = camerasData as Camera[];

const CAMERA_STATUS_COUNTS: Record<CameraStatus, number> = { Online: 0, Offline: 0, Maintenance: 0, Unknown: 0 };
allCameras.forEach(c => { CAMERA_STATUS_COUNTS[c.status]++; });

const CAMERA_DISTRICT_OPTIONS = [...new Set(allCameras.map(c => districtOf(c.location)))].sort((a, b) => a.localeCompare(b, 'th'));

const TYPE_LABEL: Record<IncidentPointType, string> = {
  risk: 'จุดเสี่ยงภัย',
  proposed: 'จุดขอติดตั้งใหม่',
};

/* Hands the Leaflet map instance up to the page (via useMap(), only available
   inside <MapContainer>) so the overlay buttons outside it can call flyTo(). */
function MapInstanceCapture({ onReady }: { onReady: (map: LeafletMap) => void }) {
  const map = useMap();
  useEffect(() => { onReady(map); }, [map, onReady]);
  return null;
}

/* Arms click-to-place mode on the map; only active while `active` is true */
function AddPinCapture({ active, onPick }: { active: boolean; onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: e => { if (active) onPick(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

interface DraftForm {
  locationLabel: string;
  category: string;
  frequency: string;
  description: string;
  installReason: string;
  photo: string;
}

const EMPTY_DRAFT: DraftForm = {
  locationLabel: '', category: '', frequency: '', description: '', installReason: '', photo: '',
};

function IncidentFormModal({ isOpen, onClose, type, lat, lng, onSubmit }: {
  isOpen: boolean;
  onClose: () => void;
  type: IncidentPointType;
  lat: number | null;
  lng: number | null;
  onSubmit: (form: DraftForm) => void;
}) {
  const [form, setForm] = useState<DraftForm>(EMPTY_DRAFT);
  const set = (patch: Partial<DraftForm>) => setForm(f => ({ ...f, ...patch }));

  const handlePhoto = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set({ photo: reader.result as string });
    reader.readAsDataURL(file);
  };

  const canSubmit = form.locationLabel.trim() && form.category && form.frequency && form.description.trim()
    && (type !== 'proposed' || form.installReason.trim());

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(form);
    setForm(EMPTY_DRAFT);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { setForm(EMPTY_DRAFT); onClose(); }}
      title={type === 'risk' ? 'แจ้งจุดเสี่ยงภัย' : 'ขอติดตั้งกล้อง CCTV ใหม่'}
      icon={<ShieldAlert size={20} className="text-white" />}
      size="lg"
    >
      <div className="space-y-4">
        {lat != null && lng != null && (
          <p className="text-lg text-gray-500">ตำแหน่งที่ปักหมุด: {lat.toFixed(4)}, {lng.toFixed(4)}</p>
        )}
        <div>
          <label htmlFor="ip-location" className="label">สถานที่/รายละเอียดตำแหน่ง <span className="text-red-500">*</span></label>
          <input id="ip-location" value={form.locationLabel} onChange={e => set({ locationLabel: e.target.value })} placeholder="เช่น แยกเฉลิมไทย ถนนสุขุมวิท" className="input-field" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="ip-category" className="label">ประเภทเหตุการณ์ <span className="text-red-500">*</span></label>
            <select id="ip-category" value={form.category} onChange={e => set({ category: e.target.value })} className="input-field">
              <option value="">เลือกประเภทเหตุการณ์</option>
              {INCIDENT_CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="ip-frequency" className="label">ความถี่ในการเกิดเหตุ <span className="text-red-500">*</span></label>
            <select id="ip-frequency" value={form.frequency} onChange={e => set({ frequency: e.target.value })} className="input-field">
              <option value="">เลือกความถี่</option>
              {INCIDENT_FREQUENCY_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="ip-description" className="label">รายละเอียดเพิ่มเติม <span className="text-red-500">*</span></label>
          <textarea id="ip-description" value={form.description} onChange={e => set({ description: e.target.value })} rows={3} placeholder="อธิบายลักษณะเหตุการณ์ที่พบ" className="input-field resize-none" />
        </div>

        {type === 'proposed' && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-2">
            <p className="text-xl font-bold text-yellow-800">สำหรับท้องถิ่น (จุดขอติดตั้งใหม่)</p>
            <label htmlFor="ip-reason" className="label">เหตุผลในการขอติดตั้ง <span className="text-red-500">*</span></label>
            <textarea id="ip-reason" value={form.installReason} onChange={e => set({ installReason: e.target.value })} rows={2} placeholder="เช่น เพิ่มเพื่อความปลอดภัยในชุมชน ป้องกันเหตุอาชญากรรม" className="input-field resize-none" />
          </div>
        )}

        <div>
          <span className="label">รูปภาพ (ถ้ามี)</span>
          {form.photo ? (
            <div className="flex items-center gap-3">
              <img src={form.photo} alt="รูปภาพประกอบ" className="w-24 h-24 rounded-lg object-cover border border-gray-200" />
              <button type="button" onClick={() => set({ photo: '' })} className="text-sm text-red-600 hover:underline font-medium">นำรูปออก</button>
            </div>
          ) : (
            <label className="flex items-center gap-2 border-2 border-dashed border-gray-300 hover:border-navy-500 rounded-xl px-4 py-3 cursor-pointer text-navy-700 font-bold w-fit">
              <Upload size={20} /> เพิ่มรูปภาพ
              <input type="file" accept="image/*" className="hidden" onChange={e => handlePhoto(e.target.files?.[0])} />
            </label>
          )}
        </div>

        <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
          <button onClick={() => { setForm(EMPTY_DRAFT); onClose(); }} className="btn-secondary">ยกเลิก</button>
          <button onClick={handleSubmit} disabled={!canSubmit} className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">บันทึกการแจ้งเหตุ</button>
        </div>
      </div>
    </Modal>
  );
}

export function ReportIncidentPage() {
  const { user, isPolice, isLocalOfficer, isAdmin, isOperator } = useAuth();
  const [points, setPoints] = useState<IncidentPoint[]>(() => savedIncidentPoints());
  const [addMode, setAddMode] = useState(false);
  const [draftLatLng, setDraftLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [showCameras, setShowCameras] = useState(true);
  const [showRisk, setShowRisk] = useState(true);
  const [showProposed, setShowProposed] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [legendVisible, setLegendVisible] = useState(true);
  const [leafletMap, setLeafletMap] = useState<LeafletMap | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState(false);
  const [mapHeight, setMapHeight] = useState(420);
  const [viewingCam, setViewingCam] = useState<Camera | null>(null);
  const [cameraSearch, setCameraSearch] = useState('');
  const [cameraStatusFilter, setCameraStatusFilter] = useState<CameraStatus | 'all'>('all');
  const [cameraDistrictFilter, setCameraDistrictFilter] = useState('all');

  const asideRef = useRef<HTMLElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const mapWrapperRef = useRef<HTMLDivElement>(null);

  /* keeps the map's bottom edge aligned with whichever side column is taller —
     the left sidebar or the right filter/list column — both are content-driven */
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
     wrapper's box changes (e.g. sidebar collapse toggling the grid column width). */
  useEffect(() => {
    if (!mapWrapperRef.current || !leafletMap) return;
    const observer = new ResizeObserver(() => leafletMap.invalidateSize());
    observer.observe(mapWrapperRef.current);
    return () => observer.disconnect();
  }, [leafletMap]);

  /* shared geolocation getter — used by both the "ตำแหน่งของฉัน" button and its marker */
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

  const handleResetView = () => {
    leafletMap?.flyTo(MAP_CENTER, 11, { duration: 0.8 });
  };

  const myType: IncidentPointType | null = isPolice ? 'risk' : isLocalOfficer ? 'proposed' : null;
  const refresh = () => setPoints(savedIncidentPoints());

  const filteredCameras = useMemo(() => {
    const q = cameraSearch.trim().toLowerCase();
    return allCameras.filter(cam =>
      (!q || cam.id.toLowerCase().includes(q) || cam.location.toLowerCase().includes(q)) &&
      (cameraStatusFilter === 'all' || cam.status === cameraStatusFilter) &&
      (cameraDistrictFilter === 'all' || districtOf(cam.location) === cameraDistrictFilter)
    );
  }, [cameraSearch, cameraStatusFilter, cameraDistrictFilter]);

  const riskCount = points.filter(p => p.type === 'risk').length;
  const proposedCount = points.filter(p => p.type === 'proposed').length;
  // cluster by proximity (all statuses) so the map shows how many times each
  // spot has been reported, not just the approved ones
  const riskGroups = clusterByProximity(points.filter(p => p.type === 'risk'));
  const proposedGroups = clusterByProximity(points.filter(p => p.type === 'proposed'));

  const inDateRange = (iso: string) => {
    const d = iso.slice(0, 10);
    return (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo);
  };

  const feedItems = [...points]
    .filter(p => inDateRange(p.submittedAt))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  const handlePick = (lat: number, lng: number) => {
    setDraftLatLng({ lat, lng });
    setFormOpen(true);
  };

  const handleSubmitForm = (form: { locationLabel: string; category: string; frequency: string; description: string; installReason: string; photo: string }) => {
    if (!myType || !draftLatLng || !user) return;
    const point: IncidentPoint = {
      id: `IP-${Date.now()}`,
      type: myType,
      lat: draftLatLng.lat,
      lng: draftLatLng.lng,
      locationLabel: form.locationLabel,
      category: form.category,
      frequency: form.frequency,
      description: form.description,
      installReason: myType === 'proposed' ? form.installReason : undefined,
      photo: form.photo || undefined,
      submittedBy: user.name,
      submittedByUserId: user.id,
      submittedAt: new Date().toISOString(),
      status: 'pending',
    };
    addIncidentPoint(point);
    logAudit(user, 'create', 'แจ้งเหตุ', `แจ้ง${TYPE_LABEL[myType]}: ${form.locationLabel}`);
    refresh();
    setFormOpen(false);
    setAddMode(false);
    setDraftLatLng(null);
  };

  const handleExport = () => {
    exportRowsToExcel(
      [
        ['ประเภท', 'ตำแหน่ง', 'ประเภทเหตุการณ์', 'ความถี่', 'ผู้แจ้ง', 'วันที่แจ้ง', 'สถานะ'],
        ...feedItems.map(p => [
          TYPE_LABEL[p.type], p.locationLabel, p.category, p.frequency, p.submittedBy,
          formatThaiDateTime(p.submittedAt), INCIDENT_STATUS_LABEL[p.status],
        ]),
      ],
      'แจ้งเหตุ',
      `รายการแจ้งเหตุ-${todayStamp()}.xlsx`
    );
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col">
      <SkipLink />
      <Navbar />
      <h1 className="sr-only">แจ้งเหตุ (จุดเสี่ยงภัย/จุดขอติดตั้ง)</h1>

      <div className={`flex-1 w-full max-w-[1400px] mx-auto px-4 py-6 grid grid-cols-1 gap-5 items-start ${sidebarCollapsed ? 'lg:grid-cols-[64px_minmax(0,1fr)_320px]' : 'lg:grid-cols-[280px_minmax(0,1fr)_320px]'}`}>
        <div className="lg:hidden"><ServiceMenuChips active="reportIncident" /></div>
        <aside ref={asideRef} className="hidden lg:block">
          <ServiceSidebar active="reportIncident" collapsible collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
        </aside>

        <main id="main-content" tabIndex={-1} className="min-w-0 focus:outline-none space-y-5">
          {(isAdmin || isOperator) && (
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 flex items-center justify-between gap-3">
              <p className="text-lg text-navy-700">มุมมองนี้แสดงเพื่อดูตัวอย่างเท่านั้น เจ้าหน้าที่ อบจ. ตรวจสอบและอนุมัติได้ที่หน้าตรวจสอบจุดแจ้งเหตุ</p>
              <Link to="/admin/incidents" className="btn-primary whitespace-nowrap">ไปหน้าตรวจสอบ</Link>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Video} label="กล้องทั้งหมด" value={allCameras.length} color="#1B3A6B" unit="ตัว" />
            <StatCard icon={Wifi} label="ออนไลน์" value={CAMERA_STATUS_COUNTS.Online} color={STATUS_COLORS.Online} unit="ตัว" />
            <StatCard icon={VideoOff} label="ออฟไลน์" value={CAMERA_STATUS_COUNTS.Offline} color={STATUS_COLORS.Offline} unit="ตัว" />
            <StatCard icon={Wrench} label="อยู่ระหว่างบำรุงรักษา" value={CAMERA_STATUS_COUNTS.Maintenance} color={STATUS_COLORS.Maintenance} unit="ตัว" />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-stretch">
            <div className="flex-1"><StatCard icon={AlertTriangle} label="จุดเสี่ยงภัยทั้งหมด" value={riskCount} color="#DC2626" /></div>
            <div className="flex-1"><StatCard icon={ShieldAlert} label="จุดขอติดตั้งใหม่ทั้งหมด" value={proposedCount} color="#CA8A04" /></div>

            {myType && (
              !addMode ? (
                <button
                  onClick={() => setAddMode(true)}
                  className={`btn-primary flex items-center justify-center gap-1.5 whitespace-nowrap text-base px-2.5 py-1 ${myType === 'risk' ? 'bg-red-600 border-red-700 hover:bg-red-700' : 'bg-yellow-500 border-yellow-600 hover:bg-yellow-600'}`}
                >
                  <Plus size={14} /> {myType === 'risk' ? 'ปักหมุดจุดเสี่ยงภัย' : 'ปักหมุดจุดขอติดตั้งใหม่'}
                </button>
              ) : (
                <div className="flex-1 flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                  <MapPin size={22} className="text-navy-700 flex-shrink-0" />
                  <p className="text-lg text-navy-700 flex-1">คลิกบนแผนที่เพื่อปักหมุดตำแหน่ง</p>
                  <button onClick={() => setAddMode(false)} className="text-gray-500 hover:text-red-500"><X size={20} /></button>
                </div>
              )
            )}
          </div>
          {geoError && (
            <p className="text-lg text-red-600 flex items-center gap-1.5 -mt-3">
              <MapPin size={16} /> ไม่สามารถเข้าถึงตำแหน่งของคุณได้ กรุณาอนุญาตการเข้าถึงตำแหน่งในเบราว์เซอร์
            </p>
          )}

          <div ref={mapWrapperRef} className="rounded-xl overflow-hidden border border-gray-200 relative z-0" style={{ height: mapHeight }}>
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

            {/* reset view (top-right) */}
            <div className="absolute top-3 right-3 z-[500] flex flex-col gap-2">
              <button
                onClick={handleResetView}
                className="flex items-center gap-2 bg-white hover:bg-navy-50 text-navy-700 text-sm font-bold px-3 py-2 rounded-lg shadow-lg border border-gray-200 transition-colors"
              >
                <RotateCcw size={16} className="flex-shrink-0" /> รีเซ็ตมุมมองแผนที่
              </button>
            </div>

            {/* point-type legend (bottom-left) — can be hidden */}
            <div className="absolute bottom-3 left-3 z-[500] pointer-events-none">
              {legendVisible ? (
                <div className="pointer-events-auto bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 px-3 py-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-bold text-gray-700">
                  <span className="text-gray-500">สัญลักษณ์:</span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS.Online }} />
                    กล้อง CCTV: {STATUS_LABELS.Online}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS.Offline }} />
                    {STATUS_LABELS.Offline}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS.Maintenance }} />
                    {STATUS_LABELS.Maintenance}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: POINT_COLORS.risk }} />
                    จุดเสี่ยงภัย
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: POINT_COLORS.proposed }} />
                    จุดขอติดตั้งใหม่
                  </span>
                  <button
                    onClick={() => setLegendVisible(false)}
                    aria-label="ซ่อนสัญลักษณ์"
                    title="ซ่อนสัญลักษณ์"
                    className="pointer-events-auto text-gray-400 hover:text-gray-600 flex-shrink-0"
                  >
                    <EyeOff size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setLegendVisible(true)}
                  aria-label="แสดงสัญลักษณ์"
                  title="แสดงสัญลักษณ์"
                  className="pointer-events-auto flex items-center gap-1.5 bg-white/95 backdrop-blur-sm hover:bg-navy-50 text-navy-700 text-sm font-bold px-3 py-1.5 rounded-lg shadow-lg border border-gray-200 transition-colors"
                >
                  <Eye size={16} /> สัญลักษณ์
                </button>
              )}
            </div>

            <MapContainer center={MAP_CENTER} zoom={11} className="w-full h-full">
              <MapInstanceCapture onReady={setLeafletMap} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {userPos && <Marker position={[userPos.lat, userPos.lng]} icon={userLocationIcon()} />}
              <AddPinCapture active={addMode} onPick={handlePick} />

              {showCameras && (
                <CameraClusterMarkers cameras={filteredCameras} renderMarker={cam => (
                  <Marker key={cam.id} position={[cam.lat, cam.lng]} icon={pinIcon(STATUS_COLORS[cam.status])}>
                    <Popup minWidth={200}>
                      <div style={{ fontFamily: "'TH Sarabun New', sans-serif" }}>
                        <p className="font-extrabold text-navy-700 text-xl leading-tight">{cam.id}</p>
                        <p className="text-lg text-gray-800">{cam.location}</p>
                        <p className="mt-1 text-base font-bold flex items-center gap-1.5" style={{ color: STATUS_COLORS[cam.status] }}>
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[cam.status] }} />
                          {STATUS_LABELS[cam.status]}
                        </p>
                        {cam.status === 'Online' && (
                          <button
                            onClick={() => setViewingCam(cam)}
                            className="mt-2 w-full bg-navy-700 hover:bg-navy-600 text-white text-base font-bold py-2 rounded-lg flex items-center justify-center gap-2"
                          >
                            <Video size={16} /> ดู Live
                          </button>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                )} />
              )}

              {showRisk && riskGroups.map(group => (
                group.items.length > 1 ? (
                  <Marker key={`risk-cluster-${group.lat}-${group.lng}`} position={[group.lat, group.lng]} icon={clusterCountIcon(group.items.length, '#DC2626')}>
                    <Popup minWidth={240}>
                      <div style={{ fontFamily: "'TH Sarabun New', sans-serif" }}>
                        <p className="font-extrabold text-red-700 text-xl leading-tight">จุดเสี่ยงภัย — แจ้งมาแล้ว {group.items.length} ครั้ง</p>
                        <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                          {group.items.map(p => (
                            <div key={p.id} className="border-t border-gray-100 pt-2 first:border-0 first:pt-0">
                              <p className="text-lg font-bold text-gray-800">{p.locationLabel}</p>
                              <p className="text-base text-gray-600">{p.category} · {p.frequency}</p>
                              <p className="text-base text-gray-500">แจ้งโดย {p.submittedBy} · {formatThaiDate(p.submittedAt)} · {INCIDENT_STATUS_LABEL[p.status]}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ) : (
                  <Marker key={group.items[0].id} position={[group.lat, group.lng]} icon={pinIcon(POINT_COLORS.risk)}>
                    <Popup minWidth={220}>
                      <div style={{ fontFamily: "'TH Sarabun New', sans-serif" }}>
                        <p className="font-extrabold text-red-700 text-xl leading-tight">จุดเสี่ยงภัย</p>
                        <p className="text-lg font-bold text-gray-800">{group.items[0].locationLabel}</p>
                        <p className="text-base text-gray-600">{group.items[0].category} · {group.items[0].frequency}</p>
                        <p className="text-base text-gray-500 mt-1">แจ้งโดย {group.items[0].submittedBy} · {formatThaiDate(group.items[0].submittedAt)} · {INCIDENT_STATUS_LABEL[group.items[0].status]}</p>
                      </div>
                    </Popup>
                  </Marker>
                )
              ))}

              {showProposed && proposedGroups.map(group => (
                group.items.length > 1 ? (
                  <Marker key={`proposed-cluster-${group.lat}-${group.lng}`} position={[group.lat, group.lng]} icon={clusterCountIcon(group.items.length, '#CA8A04')}>
                    <Popup minWidth={240}>
                      <div style={{ fontFamily: "'TH Sarabun New', sans-serif" }}>
                        <p className="font-extrabold text-yellow-700 text-xl leading-tight">จุดขอติดตั้งใหม่ — แจ้งมาแล้ว {group.items.length} ครั้ง</p>
                        <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                          {group.items.map(p => (
                            <div key={p.id} className="border-t border-gray-100 pt-2 first:border-0 first:pt-0">
                              <p className="text-lg font-bold text-gray-800">{p.locationLabel}</p>
                              <p className="text-base text-gray-600">{p.category} · {p.frequency}</p>
                              <p className="text-base text-gray-500">แจ้งโดย {p.submittedBy} · {formatThaiDate(p.submittedAt)} · {INCIDENT_STATUS_LABEL[p.status]}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ) : (
                  <Marker key={group.items[0].id} position={[group.lat, group.lng]} icon={pinIcon(POINT_COLORS.proposed)}>
                    <Popup minWidth={220}>
                      <div style={{ fontFamily: "'TH Sarabun New', sans-serif" }}>
                        <p className="font-extrabold text-yellow-700 text-xl leading-tight">จุดขอติดตั้งใหม่</p>
                        <p className="text-lg font-bold text-gray-800">{group.items[0].locationLabel}</p>
                        <p className="text-base text-gray-600">{group.items[0].category} · {group.items[0].frequency}</p>
                        <p className="text-base text-gray-500 mt-1">แจ้งโดย {group.items[0].submittedBy} · {formatThaiDate(group.items[0].submittedAt)} · {INCIDENT_STATUS_LABEL[group.items[0].status]}</p>
                      </div>
                    </Popup>
                  </Marker>
                )
              ))}
            </MapContainer>
          </div>
        </main>

        <aside ref={rightPanelRef} className="space-y-4">
          <div className="card">
            <h3 className="text-2xl font-bold text-navy-700 mb-3">ตัวกรองข้อมูล</h3>
            <p className="label mb-2">ค้นหากล้อง CCTV</p>
            <input
              value={cameraSearch}
              onChange={e => setCameraSearch(e.target.value)}
              placeholder="ค้นหารหัสกล้อง/สถานที่..."
              className="input-field mb-2"
            />
            <div className="grid grid-cols-2 gap-2 mb-4">
              <select value={cameraStatusFilter} onChange={e => setCameraStatusFilter(e.target.value as CameraStatus | 'all')} className="input-field text-sm">
                <option value="all">สถานะ: ทั้งหมด</option>
                <option value="Online">{STATUS_LABELS.Online}</option>
                <option value="Offline">{STATUS_LABELS.Offline}</option>
                <option value="Maintenance">{STATUS_LABELS.Maintenance}</option>
                <option value="Unknown">{STATUS_LABELS.Unknown}</option>
              </select>
              <select value={cameraDistrictFilter} onChange={e => setCameraDistrictFilter(e.target.value)} className="input-field text-sm">
                <option value="all">อำเภอ: ทั้งหมด</option>
                {CAMERA_DISTRICT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <p className="label mb-2">ประเภทจุด</p>
            <div className="space-y-2 mb-4">
              <label className="flex items-center gap-2 text-lg text-gray-700 cursor-pointer">
                <input type="checkbox" checked={showCameras} onChange={e => setShowCameras(e.target.checked)} className="w-4 h-4 accent-[#1b3a6b]" />
                <CameraIcon size={16} className="text-green-600" /> กล้อง CCTV (ติดตั้งแล้ว) — พบ {filteredCameras.length} ตัว
              </label>
              <label className="flex items-center gap-2 text-lg text-gray-700 cursor-pointer">
                <input type="checkbox" checked={showRisk} onChange={e => setShowRisk(e.target.checked)} className="w-4 h-4 accent-[#1b3a6b]" />
                <AlertTriangle size={16} className="text-red-600" /> จุดเสี่ยงภัย (Police Risk Points)
              </label>
              <label className="flex items-center gap-2 text-lg text-gray-700 cursor-pointer">
                <input type="checkbox" checked={showProposed} onChange={e => setShowProposed(e.target.checked)} className="w-4 h-4 accent-[#1b3a6b]" />
                <ShieldAlert size={16} className="text-yellow-600" /> จุดขอติดตั้งใหม่ (Proposed Points)
              </label>
            </div>
            <p className="label mb-2">ช่วงวันที่</p>
            <div className="flex items-center gap-2">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field text-sm" />
              <span className="text-gray-400">-</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field text-sm" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-2xl font-bold text-gray-800">รายการแจ้งเหตุล่าสุด ({feedItems.length})</h2>
              <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white font-bold border-2 border-emerald-600 shadow hover:bg-emerald-600 transition-all">
                <FileSpreadsheet size={18} /> ส่งออกข้อมูล
              </button>
            </div>
            <div className="card p-0 overflow-hidden">
              {feedItems.length === 0 ? (
                <p className="text-xl text-gray-400 text-center py-8">ไม่มีรายการแจ้งเหตุ</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {feedItems.map(p => (
                    <div key={p.id} className="flex items-start gap-3 px-4 py-3">
                      <span className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${p.type === 'risk' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xl font-bold text-gray-800">{p.locationLabel}</p>
                        <p className="text-lg text-gray-500">{p.category} · แจ้งโดย {p.submittedBy} · {formatThaiDate(p.submittedAt)}</p>
                      </div>
                      <span className={`text-sm font-bold px-2.5 py-1 rounded-lg border flex-shrink-0 ${
                        p.status === 'approved' ? 'bg-green-100 text-green-800 border-green-300'
                          : p.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {INCIDENT_STATUS_LABEL[p.status]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      <CitizenFooter />

      <LiveCameraModal camera={viewingCam} onClose={() => setViewingCam(null)} />

      <IncidentFormModal
        isOpen={formOpen}
        onClose={() => { setFormOpen(false); setDraftLatLng(null); }}
        type={myType ?? 'risk'}
        lat={draftLatLng?.lat ?? null}
        lng={draftLatLng?.lng ?? null}
        onSubmit={handleSubmitForm}
      />
    </div>
  );
}
