import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Search, Video, AlertTriangle, CheckCircle, X, ChevronLeft, ChevronRight, Camera as CameraIcon, Car, Crosshair, Grid2x2, Grid3x3, LayoutGrid, Maximize2, MonitorPlay, ParkingSquare, Plus, Settings, Square, Waves, Users, MapPin, Building2, Compass } from 'lucide-react';
import { Layout } from '../components/Layout';
import { LiveCameraModal, cameraImage } from '../components/LiveCameraModal';
import { useAuth } from '../context/AuthContext';
import camerasData from '../data/cameras.json';
import eventsData from '../data/events.json';
import type { Camera, CctvEvent, EventType } from '../types';
import { EVENT_COLORS, EVENT_LABELS } from '../types';
import { formatThaiDateTime, formatThaiDateTimeSec, timeAgo } from '../utils/formatDate';
import { pinIcon, pinSvg } from '../utils/mapPin';

const cameras = camerasData as Camera[];
const initialEvents = eventsData as CctvEvent[];

const MARKER_COLORS: Record<string, string> = {
  traffic: '#F97316',
  gunshot: '#EF4444',
  parking: '#92400E',
  flood: '#3B82F6',
  crowd: '#EAB308',
  normal: '#22C55E',
  offline: '#9CA3AF',
};

const EVENT_TYPE_ICONS = {
  normal:  CheckCircle,
  traffic: Car,
  gunshot: Crosshair,
  parking: ParkingSquare,
  flood:   Waves,
  crowd:   Users,
} as const;

function getMarkerColor(cam: Camera): string {
  if (cam.status === 'Offline') return MARKER_COLORS.offline;
  if (cam.currentEvent && cam.currentEvent !== 'normal') return MARKER_COLORS[cam.currentEvent] ?? MARKER_COLORS.normal;
  return MARKER_COLORS.normal;
}

interface LiveSlot { cameraId: string | null }

const MOBILE_QUERY = '(max-width: 767px)';

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isMobile;
}

export function MapPage() {
  const { canEdit } = useAuth();
  const isMobile = useIsMobile();
  const [events, setEvents] = useState<CctvEvent[]>(initialEvents);
  const [search, setSearch] = useState('');
  const [eventFilters, setEventFilters] = useState<Set<EventType>>(new Set());
  const [selectedCam, setSelectedCam] = useState<Camera | null>(null);
  const [liveCam, setLiveCam] = useState<Camera | null>(null);
  const [ackEvent, setAckEvent] = useState<CctvEvent | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [leftPanelVisible, setLeftPanelVisible] = useState(false);
  // desktop opens the live panel by default; on mobile keep the map unobstructed
  const [rightPanelVisible, setRightPanelVisible] = useState(() => !window.matchMedia(MOBILE_QUERY).matches);

  // on mobile the panels overlay the map, so only one may be open at a time
  const toggleLeftPanel = () => {
    setLeftPanelVisible(v => {
      if (!v && isMobile) setRightPanelVisible(false);
      return !v;
    });
  };
  const toggleRightPanel = () => {
    setRightPanelVisible(v => {
      if (!v && isMobile) setLeftPanelVisible(false);
      return !v;
    });
  };
  const [liveSlots, setLiveSlots] = useState<LiveSlot[]>([
    { cameraId: 'CAM-001' }, { cameraId: 'CAM-002' }, { cameraId: 'CAM-003' },
    { cameraId: 'CAM-005' }, { cameraId: 'CAM-009' }, { cameraId: null },
  ]);
  const [layoutCount, setLayoutCount] = useState(6);
  const [manageMode, setManageMode] = useState(false);
  const [pickSlot, setPickSlot] = useState<number | null>(null);
  const livePanelRef = useRef<HTMLDivElement>(null);

  const toggleEventFilter = (type: EventType) => {
    setEventFilters(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  };

  const filteredCameras = useMemo(() => {
    const hasEvent = (cam: Camera) => cam.currentEvent && cam.currentEvent !== 'normal';
    return cameras
      .filter(cam => {
        const matchSearch = cam.name.toLowerCase().includes(search.toLowerCase()) ||
          cam.id.toLowerCase().includes(search.toLowerCase());
        const matchEvent = eventFilters.size === 0 || (cam.currentEvent != null && eventFilters.has(cam.currentEvent));
        return matchSearch && matchEvent;
      })
      .sort((a, b) => {
        const offline = (c: Camera) => c.status === 'Offline' ? 1 : 0;
        const event   = (c: Camera) => hasEvent(c) ? 1 : 0;
        if (offline(a) !== offline(b)) return offline(a) - offline(b);
        return event(b) - event(a);
      });
  }, [search, eventFilters]);

  const latestEvents = useMemo(() =>
    [...events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10),
    [events]
  );

  const unackEvents = events.filter(e => !e.isAcknowledged);

  const handleAcknowledge = useCallback(() => {
    if (!ackEvent) return;
    setEvents(prev => prev.map(e =>
      e.id === ackEvent.id
        ? { ...e, isAcknowledged: true, acknowledgedBy: 'ผู้ดูแลระบบ', acknowledgedAt: new Date().toISOString(), actionNote: actionNote || 'N/A' }
        : e
    ));
    setAckEvent(null);
    setActionNote('');
  }, [ackEvent, actionNote]);

  const assignLive = (camId: string, slotIndex?: number) => {
    const alreadyAssigned = liveSlots.findIndex(s => s.cameraId === camId);
    if (alreadyAssigned >= 0) return;
    setLiveSlots(prev => {
      const n = [...prev];
      const target = slotIndex ?? n.findIndex(s => !s.cameraId);
      n[target >= 0 ? target : n.length - 1] = { cameraId: camId };
      return n;
    });
  };

  const removeFromLive = (index: number) => {
    setLiveSlots(prev => { const n = [...prev]; n[index] = { cameraId: null }; return n; });
  };

  const setLayout = (count: number) => {
    setLayoutCount(count);
    setLiveSlots(prev => {
      // keep assigned cameras first so shrinking the grid never drops them needlessly
      const next = prev.filter(s => s.cameraId).slice(0, count);
      while (next.length < count) next.push({ cameraId: null });
      return next;
    });
  };

  return (
    <Layout>
      <div className="relative flex h-full min-h-0">
        {/* Left panel */}
        <div className={`bg-blue-50 flex flex-col flex-shrink-0 overflow-hidden transition-all duration-300 border-r border-blue-200 max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-[450] max-md:shadow-2xl ${leftPanelVisible ? 'w-80' : 'w-0'}`}>
          <div className="p-3 border-b border-blue-200 min-w-[320px]">
            <h2 className="text-navy-700 font-semibold text-xl mb-2">แผนที่กล้อง CCTV</h2>
            <div className="relative mb-2">
              <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-navy-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ค้นหากล้อง..."
                className="w-full bg-white text-navy-700 placeholder-navy-300 text-xl pl-8 pr-3 py-2 rounded-lg border border-blue-200 focus:outline-none focus:border-navy-500"
              />
            </div>
            <p className="text-navy-700 text-base font-semibold mb-2">เลือกเหตุการณ์ :</p>
            <div className="grid grid-cols-3 gap-1.5 min-w-[296px]">
              <button
                onClick={() => setEventFilters(new Set())}
                className={`col-span-3 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border-2 font-bold text-base shadow-sm transition-all ${
                  eventFilters.size === 0
                    ? 'bg-navy-700 text-white border-navy-700 shadow-navy-200'
                    : 'bg-white text-navy-700 border-navy-300 hover:bg-navy-50'
                }`}
              >ทั้งหมด</button>
              {([
                { value: 'normal'  as EventType, label: 'ปกติ',     Icon: CheckCircle },
                { value: 'traffic' as EventType, label: 'รถติด',    Icon: Car },
                { value: 'gunshot' as EventType, label: 'เสียงปืน', Icon: Crosshair },
                { value: 'parking' as EventType, label: 'จอดผิด',   Icon: ParkingSquare },
                { value: 'flood'   as EventType, label: 'น้ำท่วม',  Icon: Waves },
                { value: 'crowd'   as EventType, label: 'ชุมนุม',   Icon: Users },
              ]).map(opt => {
                const active = eventFilters.has(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => toggleEventFilter(opt.value)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border-2 font-bold text-sm shadow-sm transition-all ${
                      active ? 'text-white shadow-md' : 'bg-white text-navy-700 hover:brightness-95'
                    }`}
                    style={active
                      ? { backgroundColor: MARKER_COLORS[opt.value], borderColor: MARKER_COLORS[opt.value] }
                      : { borderColor: MARKER_COLORS[opt.value] }
                    }
                  >
                    <opt.Icon size={15} className="flex-shrink-0" style={{ color: active ? 'white' : MARKER_COLORS[opt.value] }} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1 min-w-[320px]">
            {filteredCameras.map(cam => (
              <button
                key={cam.id}
                onClick={() => { setSelectedCam(cam); assignLive(cam.id); }}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                  selectedCam?.id === cam.id ? 'border-2 border-navy-700 bg-blue-100' : 'hover:bg-blue-100 border-2 border-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CameraIcon
                    size={18}
                    className="flex-shrink-0"
                    style={{ color: getMarkerColor(cam) }}
                  />
                  <p className="min-w-0 flex-1 text-navy-700 text-base font-bold truncate">
                    {cam.id} : {cam.location}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <div className="p-2 border-t border-blue-200 text-lg text-navy-700 font-bold text-center min-w-[320px]">
            แสดง {filteredCameras.length} / {cameras.length} กล้อง
          </div>
        </div>

        {/* Toggle left panel button */}
        <button
          onClick={toggleLeftPanel}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-[451] bg-blue-50 text-navy-700 p-1 rounded-r-lg shadow-md border border-blue-200 hover:bg-blue-100 transition-colors"
          style={{ left: leftPanelVisible ? '320px' : '0px' }}
          title={leftPanelVisible ? 'ซ่อนรายการกล้อง' : 'แสดงรายการกล้อง'}
        >
          {leftPanelVisible ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>

        {/* Center map */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Unacknowledged alert banners — above map, not absolute */}
          {unackEvents.length > 0 && (
            <div className="flex-shrink-0 space-y-1 p-2 bg-gray-100 border-b border-gray-200 z-10">
              {unackEvents.slice(0, 2).map(ev => (
                <div
                  key={ev.id}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-white text-sm shadow-lg"
                  style={{ backgroundColor: EVENT_COLORS[ev.eventType] }}
                >
                  <AlertTriangle size={16} className="flex-shrink-0" />
                  <span className="flex-1 truncate">
                    {ev.cameraId} · {EVENT_LABELS[ev.eventType]} · {timeAgo(ev.timestamp)}
                  </span>
                  {canEdit && (
                    <button
                      onClick={() => { setAckEvent(ev); setActionNote(''); }}
                      className="bg-white/20 hover:bg-white/30 text-white text-xs px-2 py-1 rounded flex-shrink-0"
                    >
                      รับทราบ
                    </button>
                  )}
                </div>
              ))}
              {unackEvents.length > 2 && (
                <div className="bg-gray-800/80 text-white text-xs px-3 py-1 rounded-lg">
                  และอีก {unackEvents.length - 2} เหตุการณ์รอรับทราบ
                </div>
              )}
            </div>
          )}

          <div className="flex-1 relative min-w-0">
          <MapContainer
            center={[13.22, 101.02]}
            zoom={11}
            className="w-full h-full"
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {cameras.map(cam => (
              <Marker
                key={cam.id}
                position={[cam.lat, cam.lng]}
                icon={pinIcon(getMarkerColor(cam))}
              >
                <Popup minWidth={260}>
                  <div style={{ fontFamily: "'TH Sarabun New', sans-serif", minWidth: 260 }}>
                    {/* Header */}
                    <div className="flex items-center gap-2.5 pb-2.5 mb-2.5 border-b border-gray-100">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: getMarkerColor(cam) + '22' }}>
                        <CameraIcon size={22} style={{ color: getMarkerColor(cam) }} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-navy-700 text-2xl leading-tight">{cam.id}</p>
                        <div className="flex items-center gap-1 text-gray-400 text-sm">
                          <Compass size={13} />
                          <span>{cam.type} · {cam.direction}</span>
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-start gap-2 mb-2">
                      <MapPin size={18} className="text-navy-400 mt-0.5 flex-shrink-0" />
                      <p className="text-lg font-bold text-gray-800 leading-snug">{cam.location}</p>
                    </div>

                    {/* Organization */}
                    <div className="flex items-start gap-2 mb-3">
                      <Building2 size={18} className="text-navy-400 mt-0.5 flex-shrink-0" />
                      <p className="text-base text-gray-500">{cam.organization}</p>
                    </div>

                    {/* Status + Event badges */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-lg font-bold ${
                        cam.status === 'Online' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cam.status === 'Online' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                        {cam.status}
                      </span>
                      {cam.currentEvent && cam.currentEvent !== 'normal' && (
                        <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-lg text-white font-bold" style={{ backgroundColor: EVENT_COLORS[cam.currentEvent] }}>
                          {EVENT_LABELS[cam.currentEvent]}
                        </span>
                      )}
                    </div>

                    {/* Last update */}
                    <p className="text-sm text-gray-400 mb-3">
                      อัปเดต: {cam.lastUpdate ? formatThaiDateTimeSec(cam.lastUpdate) : '—'}
                    </p>

                    {/* Live buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setLiveCam(cam)}
                        className="flex-1 bg-navy-700 hover:bg-navy-600 text-white text-base font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Video size={18} />
                        ดู Live
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => assignLive(cam.id)}
                          className="flex-1 bg-white hover:bg-navy-50 text-navy-700 border border-navy-500 text-base font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <MonitorPlay size={18} />
                          เพิ่มเข้าจอ Live
                        </button>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Legend */}
          <div className="absolute bottom-6 left-2 bg-white rounded-lg shadow-lg p-2 z-[400] text-xs">
            <p className="font-semibold text-gray-700 mb-1">สัญลักษณ์</p>
            {Object.entries({ normal: 'ปกติ', traffic: 'รถติด', gunshot: 'เสียงปืน', parking: 'จอดผิด', flood: 'น้ำท่วม', crowd: 'ชุมนุม', offline: 'ออฟไลน์' }).map(([k, label]) => (
              <div key={k} className="flex items-center gap-1.5 mb-0.5">
                <span dangerouslySetInnerHTML={{ __html: pinSvg(MARKER_COLORS[k], 11, 15) }} />
                <span className="text-gray-600">{label}</span>
              </div>
            ))}
          </div>
          </div>
        </div>

        {/* Toggle right panel button */}
        <button
          onClick={toggleRightPanel}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-[451] bg-white border border-gray-200 text-gray-600 p-1 rounded-l-lg shadow-lg hover:bg-gray-50 transition-colors"
          style={{ right: rightPanelVisible ? '320px' : '0px' }}
          title={rightPanelVisible ? 'ซ่อนแผงขวา' : 'แสดงแผงขวา'}
        >
          {rightPanelVisible ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>

        {/* Right panel */}
        <div className={`bg-white border-l border-gray-200 flex flex-col flex-shrink-0 overflow-hidden transition-all duration-300 max-md:absolute max-md:inset-y-0 max-md:right-0 max-md:z-[450] max-md:shadow-2xl ${rightPanelVisible ? 'w-80' : 'w-0'}`}>
          {/* Events */}
          <div className="p-3 border-b border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-2">เหตุการณ์ล่าสุด</h3>
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {latestEvents.map(ev => {
                const EvIcon = EVENT_TYPE_ICONS[ev.eventType] ?? CheckCircle;
                const isActive = !ev.isAcknowledged && ev.eventType !== 'normal';
                return (
                <div key={ev.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                  <EvIcon
                    size={16}
                    className={`flex-shrink-0 ${isActive ? 'animate-blink' : ''}`}
                    style={{ color: EVENT_COLORS[ev.eventType] }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold truncate" style={{ color: EVENT_COLORS[ev.eventType] }}>
                      {ev.cameraId} : {ev.cameraName} - {EVENT_LABELS[ev.eventType]}
                    </p>
                    <p className="text-sm text-navy-700">{formatThaiDateTimeSec(ev.timestamp)}</p>
                  </div>
                  {ev.isAcknowledged
                    ? <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                    : canEdit && (
                      <button onClick={() => { setAckEvent(ev); setActionNote(''); }} className="flex-shrink-0">
                        <AlertTriangle size={14} className="text-orange-500" />
                      </button>
                    )
                  }
                </div>
                );
              })}
            </div>
          </div>

          {/* Live cameras */}
          <div ref={livePanelRef} className="flex-1 flex flex-col min-h-0 bg-white">
            <div className="flex items-center justify-between gap-2 p-3 pb-2">
              <h3 className="text-xl font-bold text-navy-700">Live Camera ({liveSlots.filter(s => s.cameraId).length}/{cameras.length})</h3>
              <button
                onClick={() => setManageMode(m => !m)}
                className={`flex items-center gap-1.5 text-sm font-bold px-2.5 py-1.5 rounded-lg border transition-colors ${
                  manageMode ? 'bg-navy-700 text-white border-navy-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Settings size={15} /> จัดการการแสดงผล
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3">
              <div className={`grid gap-2 ${layoutCount === 1 ? 'grid-cols-1' : layoutCount === 9 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {liveSlots.map((slot, idx) => {
                  const cam = cameras.find(c => c.id === slot.cameraId);
                  return cam ? (
                    <div key={idx} className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video">
                      <button
                        onClick={() => setLiveCam(cam)}
                        className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900"
                        title="คลิกเพื่อดู Live ขนาดใหญ่"
                      >
                        <img
                          src={cameraImage(cam)}
                          alt={cam.location}
                          className="absolute inset-0 w-full h-full object-cover hover:opacity-90 transition-opacity"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </button>
                      <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
                        <span className="bg-gray-900/80 text-white text-xs font-bold px-2 py-0.5 rounded-md">{cam.id}</span>
                        <span className="flex items-center gap-1 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-md">
                          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                          LIVE
                        </span>
                      </div>
                      {manageMode && (
                        <button
                          onClick={() => removeFromLive(idx)}
                          title="นำออกจากจอ"
                          className="absolute top-7 right-1.5 bg-red-600/90 text-white rounded-md p-1 hover:bg-red-600"
                        >
                          <X size={12} />
                        </button>
                      )}
                      <p className="absolute bottom-1.5 left-2 text-white text-xs font-medium truncate max-w-[90%] pointer-events-none drop-shadow">{cam.location}</p>
                    </div>
                  ) : (
                    <button
                      key={idx}
                      onClick={() => setPickSlot(idx)}
                      className="flex flex-col items-center justify-center gap-1.5 aspect-video rounded-xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-navy-500 hover:text-navy-500 hover:bg-navy-50/40 transition-colors"
                    >
                      <Plus size={22} className="border-2 border-current rounded-full p-0.5" />
                      <span className="text-sm font-bold">เพิ่มกล้อง</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Display controls */}
            <div className="border-t border-gray-200 p-3">
              <p className="text-base font-bold text-gray-800 mb-2">การควบคุมการแสดงผล</p>
              <div className="flex items-center gap-1.5">
                {([
                  { count: 1, label: '1 จอ', Icon: Square },
                  { count: 4, label: '4 จอ', Icon: Grid2x2 },
                  { count: 6, label: '6 จอ', Icon: LayoutGrid },
                  { count: 9, label: '9 จอ', Icon: Grid3x3 },
                ]).map(({ count, label, Icon }) => (
                  <button
                    key={count}
                    onClick={() => setLayout(count)}
                    className={`flex items-center gap-1.5 text-sm font-bold px-2.5 py-2 rounded-lg border transition-colors ${
                      layoutCount === count
                        ? 'bg-navy-500 text-white border-navy-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={15} /> {label}
                  </button>
                ))}
                <button
                  onClick={() => livePanelRef.current?.requestFullscreen?.()}
                  title="แสดงผลเต็มจอ"
                  className="ml-auto p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Maximize2 size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Camera picker for empty live slot */}
      {pickSlot !== null && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPickSlot(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h3 className="text-2xl font-bold text-navy-700">เลือกกล้องเพื่อแสดงผล</h3>
              <button onClick={() => setPickSlot(null)} className="text-gray-400 hover:text-gray-600"><X size={22} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {cameras
                .filter(c => c.status === 'Online' && !liveSlots.some(s => s.cameraId === c.id))
                .map(c => (
                  <button
                    key={c.id}
                    onClick={() => { assignLive(c.id, pickSlot); setPickSlot(null); }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-blue-50 transition-colors"
                  >
                    <CameraIcon size={18} className="flex-shrink-0" style={{ color: getMarkerColor(c) }} />
                    <span className="text-xl font-bold text-navy-700 flex-shrink-0">{c.id}</span>
                    <span className="text-lg text-gray-600 truncate">{c.location}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Live CCTV Modal */}
      <LiveCameraModal camera={liveCam} onClose={() => setLiveCam(null)} />

      {/* Acknowledge Modal */}
      {ackEvent && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAckEvent(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: EVENT_COLORS[ackEvent.eventType] + '20' }}>
                <AlertTriangle style={{ color: EVENT_COLORS[ackEvent.eventType] }} size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">รับทราบเหตุการณ์</h3>
                <p className="text-sm text-gray-500">{ackEvent.cameraId} · {EVENT_LABELS[ackEvent.eventType]}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-500">เวลา:</span>
                <span className="font-medium">{formatThaiDateTime(ackEvent.timestamp)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">กล้อง:</span>
                <span className="font-medium">{ackEvent.cameraName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">ประเภท:</span>
                <span className="font-medium" style={{ color: EVENT_COLORS[ackEvent.eventType] }}>
                  {EVENT_LABELS[ackEvent.eventType]}
                </span>
              </div>
            </div>

            <label className="label">การดำเนินการ</label>
            <textarea
              value={actionNote}
              onChange={e => setActionNote(e.target.value)}
              placeholder="N/A"
              rows={3}
              className="input-field resize-none mb-4"
            />

            <div className="flex gap-3">
              <button onClick={() => setAckEvent(null)} className="btn-secondary flex-1">ยกเลิก</button>
              <button onClick={handleAcknowledge} className="btn-primary flex-1">บันทึก</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
