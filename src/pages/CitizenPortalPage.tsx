import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import {
  AlertTriangle, ChevronLeft, Clock, Download, FileText, Hash, Inbox, Mail, MapPin,
  Plus, Search, Target, User, Activity, Camera as CameraIcon,
} from 'lucide-react';
import { Layout, SkipLink } from '../components/Layout';
import { Navbar } from '../components/Navbar';
import { CitizenFooter, CitizenHero, ServiceMenuChips, ServiceSidebar } from '../components/CitizenPortalUI';
import { StatusBadge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import camerasData from '../data/cameras.json';
import type { Camera, CitizenRequest, RequestStatus, TimelineEntry } from '../types';
import { formatThaiDate, formatThaiDateTime } from '../utils/formatDate';
import { savedRequests, updateRequest } from '../utils/requestStorage';
import { logAudit } from '../utils/auditLog';
import { nearestCameras } from '../utils/geo';
import { pinIcon } from '../utils/mapPin';
import { savedSystemSettings } from '../utils/systemSettings';

const allCameras = camerasData as Camera[];

const STATUS_STEPS = ['รับคำขอ', 'ตรวจสอบข้อมูล', 'พิจารณาอนุมัติ', 'จัดเตรียมข้อมูล', 'ส่งข้อมูล'];

function markStep(timeline: TimelineEntry[], step: string): TimelineEntry[] {
  const now = new Date().toISOString();
  return timeline.map(t => (t.step === step ? { ...t, completed: true, timestamp: now } : t));
}

/* ---------- Citizen view (new theme, matches CctvRequestPage) ---------- */

function RequestList({ requests, onSelect }: { requests: CitizenRequest[]; onSelect: (r: CitizenRequest) => void }) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">คำขอของฉัน</h2>
          <p className="text-xl text-gray-500">{requests.length} รายการ</p>
        </div>
        <Link to="/portal/request" className="btn-primary flex items-center gap-2">
          <Plus size={24} /> ยื่นคำขอใหม่
        </Link>
      </div>

      <div className="space-y-3">
        {requests.map(req => (
          <button
            key={req.id}
            onClick={() => onSelect(req)}
            className="w-full text-left border border-gray-200 rounded-xl p-4 hover:border-navy-500 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-1">
              <p className="text-xl font-bold text-navy-700 flex items-center gap-1"><Hash size={18} /> {req.reqNo}</p>
              <StatusBadge status={req.status} />
            </div>
            <p className="text-2xl font-bold text-gray-800 mb-1 flex items-center gap-2">
              <MapPin size={22} className="text-navy-500 flex-shrink-0" /> {req.incidentLocation}
            </p>
            <div className="flex items-center gap-4 text-lg text-gray-500">
              <span className="flex items-center gap-1"><Clock size={17} /> ยื่นเมื่อ {formatThaiDate(req.submittedAt)}</span>
              <span className="flex items-center gap-1"><Target size={17} /> {req.purpose}</span>
            </div>
          </button>
        ))}
        {requests.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <Inbox size={48} className="mx-auto mb-2 opacity-40" />
            <p className="text-2xl">ยังไม่มีคำขอ</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* Citizens never see which camera(s) staff assigned — only whether the video
   is ready to download, once staff have sent it and set an expiry. */
function VideoDownloadSection({ req, onDownloaded }: { req: CitizenRequest; onDownloaded: () => void }) {
  const { user } = useAuth();
  const [downloading, setDownloading] = useState(false);

  if ((req.status !== 'ส่งแล้ว' && req.status !== 'ได้รับแล้ว') || !req.videoFile) return null;

  const expired = req.videoExpiresAt ? new Date() > new Date(req.videoExpiresAt) : false;

  if (expired) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
        <AlertTriangle size={22} className="text-red-600 flex-shrink-0 mt-0.5" />
        <p className="text-lg text-red-700">ไฟล์วิดีโอหมดอายุแล้ว กรุณาติดต่อเจ้าหน้าที่</p>
      </div>
    );
  }

  const handleDownload = async () => {
    setDownloading(true);
    await new Promise(r => setTimeout(r, 600));
    if (req.status === 'ส่งแล้ว') updateRequest(req.id, { status: 'ได้รับแล้ว' });
    logAudit(user, 'download', 'portal', `ดาวน์โหลดวิดีโอคำขอ ${req.reqNo}`);
    setDownloading(false);
    onDownloaded();
  };

  return (
    <div className="rounded-xl bg-green-50 border border-green-200 p-4 space-y-3">
      <p className="text-xl font-bold text-green-800">
        ไฟล์วิดีโอพร้อมดาวน์โหลด {req.videoExpiresAt && `(หมดอายุ ${formatThaiDate(req.videoExpiresAt)})`}
      </p>
      <button onClick={handleDownload} disabled={downloading} className="btn-primary flex items-center gap-2 disabled:opacity-60">
        <Download size={20} /> {downloading ? 'กำลังดาวน์โหลด...' : 'ดาวน์โหลดวิดีโอ'}
      </button>
    </div>
  );
}

function RequestDetail({ req, onBack, onRefresh }: { req: CitizenRequest; onBack: () => void; onRefresh: () => void }) {
  const completedSteps = req.timeline?.filter(t => t.completed).length ?? 0;
  const rows: [string, string][] = [
    ['สถานที่เกิดเหตุ', req.incidentLocation],
    ['ช่วงเวลา', `${req.startDatetime} – ${req.endDatetime}`],
    ['วัตถุประสงค์', req.purpose],
    ['รายละเอียด', req.description || '-'],
  ];

  return (
    <div className="card p-6 space-y-6">
      <button onClick={onBack} className="flex items-center gap-1 text-xl font-bold text-navy-700 hover:text-navy-500">
        <ChevronLeft size={24} /> กลับไปหน้ารายการ
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-navy-700 flex items-center gap-2"><Hash size={26} /> {req.reqNo}</h2>
          <p className="text-lg text-gray-500">ยื่นเมื่อ {formatThaiDateTime(req.submittedAt)}</p>
        </div>
        <StatusBadge status={req.status} />
      </div>

      {req.status === 'ปฏิเสธ' && req.rejectionReason && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertTriangle size={22} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xl font-bold text-red-800">คำขอถูกปฏิเสธ</p>
            <p className="text-lg text-red-700">{req.rejectionReason}</p>
          </div>
        </div>
      )}

      <VideoDownloadSection req={req} onDownloaded={onRefresh} />

      <section className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
          <h3 className="text-2xl font-bold text-navy-700 flex items-center gap-2"><FileText size={22} /> รายละเอียดคำขอ</h3>
        </div>
        <div className="px-4 py-3">
          {rows.map(([k, v]) => (
            <div key={k} className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
              <span className="text-xl text-gray-500 w-40 flex-shrink-0">{k}</span>
              <span className="text-xl font-bold text-gray-800">{v}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
          <h3 className="text-2xl font-bold text-navy-700 flex items-center gap-2"><Activity size={22} /> สถานะการดำเนินการ</h3>
        </div>
        <div className="px-4 py-4 space-y-1">
          {STATUS_STEPS.map((stepLabel, i) => {
            const tl = req.timeline?.find(t => t.step === stepLabel);
            const isDone = tl?.completed;
            const isCurrent = !isDone && i === completedSteps;
            return (
              <div key={stepLabel} className="flex items-stretch gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0 ${
                    isDone ? 'bg-green-500 text-white' : isCurrent ? 'bg-navy-700 text-white' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {isDone ? '✓' : i + 1}
                  </div>
                  {i < STATUS_STEPS.length - 1 && <div className="w-0.5 flex-1 min-h-[14px] bg-gray-200 my-0.5" />}
                </div>
                <div className="pt-1 pb-2">
                  <p className={`text-xl font-bold leading-tight ${isDone ? 'text-green-700' : isCurrent ? 'text-navy-700' : 'text-gray-400'}`}>
                    {stepLabel}
                  </p>
                  {tl?.timestamp && <p className="text-lg text-gray-500">{formatThaiDateTime(tl.timestamp)}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function CitizenView() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CitizenRequest[]>(() => savedRequests().filter(r => r.email === user?.email));
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refresh = () => setRequests(savedRequests().filter(r => r.email === user?.email));
  const selected = selectedId ? requests.find(r => r.id === selectedId) ?? null : null;

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col">
      <SkipLink />
      <Navbar />
      <CitizenHero title="ตรวจสอบสถานะคำขอ" />

      <div className="flex-1 w-full max-w-[1400px] mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-5 items-start">
        <div className="lg:hidden"><ServiceMenuChips active="status" /></div>
        <aside className="hidden lg:block">
          <ServiceSidebar active="status" />
        </aside>

        <main id="main-content" tabIndex={-1} className="min-w-0 focus:outline-none">
          {selected
            ? <RequestDetail req={selected} onBack={() => setSelectedId(null)} onRefresh={refresh} />
            : <RequestList requests={requests} onSelect={r => setSelectedId(r.id)} />}
        </main>
      </div>

      <CitizenFooter />
    </div>
  );
}

/* ---------- Staff view (unchanged, old Layout) ---------- */

function RejectModal({ isOpen, onClose, onConfirm }: { isOpen: boolean; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('');

  const close = () => { setReason(''); onClose(); };

  return (
    <Modal isOpen={isOpen} onClose={close} title="ปฏิเสธคำขอ" icon={<AlertTriangle size={20} className="text-white" />}>
      <div className="space-y-4">
        <label htmlFor="reject-reason" className="label">เหตุผลที่ปฏิเสธ (เช่น ไม่มีกล้องครอบคลุมพื้นที่) <span className="text-red-500">*</span></label>
        <textarea
          id="reject-reason"
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={3}
          placeholder="ไม่มีกล้อง CCTV ครอบคลุมบริเวณที่ประชาชนแจ้ง"
          className="input-field resize-none"
        />
        <div className="flex gap-3 justify-end">
          <button onClick={close} className="btn-secondary">ยกเลิก</button>
          <button
            onClick={() => { onConfirm(reason.trim()); setReason(''); }}
            disabled={!reason.trim()}
            className="btn-danger disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ปฏิเสธคำขอ
          </button>
        </div>
      </div>
    </Modal>
  );
}

function SendVideoModal({ isOpen, onClose, defaultFileName, defaultExpiryDays, onConfirm }: {
  isOpen: boolean;
  onClose: () => void;
  defaultFileName: string;
  defaultExpiryDays: number;
  onConfirm: (fileName: string, expiryDays: number) => void;
}) {
  const [fileName, setFileName] = useState(defaultFileName);
  const [expiryDays, setExpiryDays] = useState(defaultExpiryDays);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ส่งวิดีโอให้ประชาชน" icon={<Mail size={20} className="text-white" />}>
      <div className="space-y-4">
        <div>
          <label htmlFor="video-filename" className="label">ชื่อไฟล์วิดีโอ</label>
          <input id="video-filename" value={fileName} onChange={e => setFileName(e.target.value)} className="input-field" />
        </div>
        <div>
          <label htmlFor="video-expiry" className="label">ระยะเวลาที่ประชาชนดาวน์โหลดได้</label>
          <select id="video-expiry" value={expiryDays} onChange={e => setExpiryDays(Number(e.target.value))} className="input-field">
            {[30, 60, 90].map(d => <option key={d} value={d}>{d} วัน</option>)}
          </select>
        </div>
        <p className="text-lg text-gray-500 flex items-start gap-2">
          <Mail size={18} className="flex-shrink-0 mt-0.5" />
          ระบบจะจำลองการส่งอีเมลแจ้งเตือนประชาชนให้เข้าสู่ระบบมาดาวน์โหลดไฟล์เอง
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">ยกเลิก</button>
          <button onClick={() => onConfirm(fileName, expiryDays)} disabled={!fileName.trim()} className="btn-primary disabled:opacity-40">
            ส่งและแจ้งเตือน
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* keyed by req.id at the call site so switching the selected request remounts
   this with a fresh selection instead of syncing via an effect */
function CameraAssignPanel({ req, onSaved }: { req: CitizenRequest; onSaved: (auditDetail: string) => void }) {
  const [selectedCameraIds, setSelectedCameraIds] = useState<Set<string>>(() => new Set(req.assignedCameraIds));

  const nearby = nearestCameras({ lat: req.incidentLat, lng: req.incidentLng }, allCameras, 0.5);

  const toggleCamera = (id: string) => setSelectedCameraIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const save = () => {
    const ids = [...selectedCameraIds];
    updateRequest(req.id, { assignedCameraIds: ids });
    onSaved(`มอบหมายกล้อง ${ids.join(', ') || '(ไม่มี)'} ให้คำขอ ${req.reqNo}`);
  };

  return (
    <div className="card p-4 mb-4">
      <h3 className="font-bold text-navy-700 mb-3 text-3xl flex items-center gap-2"><MapPin size={22} /> มอบหมายกล้อง CCTV</h3>
      <p className="text-xl text-navy-700 mb-3">
        ละจิจูด {req.incidentLat.toFixed(4)}, ลองจิจูด {req.incidentLng.toFixed(4)}
      </p>
      <div className="rounded-xl overflow-hidden border border-gray-200 h-[260px] relative z-0 mb-3">
        <MapContainer key={req.id} center={[req.incidentLat, req.incidentLng]} zoom={16} className="w-full h-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[req.incidentLat, req.incidentLng]} icon={pinIcon('#DC2626')} />
          {nearby.map(cam => (
            <Marker
              key={cam.id}
              position={[cam.lat, cam.lng]}
              icon={pinIcon(selectedCameraIds.has(cam.id) ? '#22C55E' : '#1B3A6B')}
              eventHandlers={{ click: () => toggleCamera(cam.id) }}
            />
          ))}
        </MapContainer>
      </div>
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {nearby.map(cam => (
          <label key={cam.id} className="flex items-center gap-2 text-xl cursor-pointer">
            <input
              type="checkbox"
              checked={selectedCameraIds.has(cam.id)}
              onChange={() => toggleCamera(cam.id)}
              className="w-4 h-4 accent-[#1b3a6b]"
            />
            <span className="font-bold text-navy-700 flex-shrink-0">{cam.id}</span>
            <span className="text-gray-600 truncate flex-1">{cam.location}</span>
            <span className="text-gray-400 text-lg flex-shrink-0">{cam.distanceKm.toFixed(2)} กม.</span>
          </label>
        ))}
        {nearby.length === 0 && (
          <p className="text-lg text-gray-400 flex items-start gap-2">
            <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
            ไม่พบกล้องในรัศมี 500 เมตรจากจุดที่ปักหมุด
          </p>
        )}
      </div>
      <button onClick={save} className="btn-primary mt-3">บันทึกกล้องที่มอบหมาย</button>
    </div>
  );
}

function StaffView() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CitizenRequest[]>(() => savedRequests());
  const [selectedId, setSelectedId] = useState<string | null>(() => savedRequests()[0]?.id ?? null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);

  const refresh = () => setRequests(savedRequests());
  const selected = selectedId ? requests.find(r => r.id === selectedId) ?? null : null;

  const filtered = requests.filter(r => {
    const matchSearch = r.reqNo.includes(search) || r.citizenName.includes(search);
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const mutate = (id: string, patch: Partial<CitizenRequest>, auditDetail: string) => {
    updateRequest(id, patch);
    logAudit(user, 'edit', 'portal', auditDetail);
    refresh();
  };

  const updateStatus = (id: string, newStatus: RequestStatus, timelineStep?: string) => {
    const req = requests.find(r => r.id === id);
    const patch: Partial<CitizenRequest> = { status: newStatus };
    if (timelineStep && req) patch.timeline = markStep(req.timeline, timelineStep);
    mutate(id, patch, `เปลี่ยนสถานะคำขอ ${req?.reqNo ?? id} เป็น ${newStatus}`);
  };

  const confirmReject = (reason: string) => {
    if (!selected || !reason) return;
    mutate(selected.id, { status: 'ปฏิเสธ', rejectionReason: reason }, `ปฏิเสธคำขอ ${selected.reqNo}: ${reason}`);
    setRejectOpen(false);
  };

  const confirmSend = (fileName: string, expiryDays: number) => {
    if (!selected) return;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);
    const expiresAt = expiryDate.toISOString();
    mutate(
      selected.id,
      { status: 'ส่งแล้ว', videoFile: fileName, videoExpiresAt: expiresAt, timeline: markStep(selected.timeline, 'ส่งข้อมูล') },
      `ส่งวิดีโอคำขอ ${selected.reqNo} (${fileName}) แจ้งเตือนทางอีเมลแล้ว หมดอายุ ${formatThaiDate(expiresAt)}`
    );
    setSendOpen(false);
  };

  return (
    <div className="flex h-full min-h-0">
      {/* Inbox list */}
      <div className="w-96 border-r border-gray-200 flex flex-col bg-white">
        <div className="p-3 border-b border-gray-100">
          <h2 className="font-bold text-navy-700 mb-2 text-3xl flex items-center gap-2"><Inbox size={24} /> คำขอประชาชน ({filtered.length})</h2>
          <div className="relative mb-2">
            <Search size={20} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหา..."
              aria-label="ค้นหาคำขอด้วยเลขที่คำขอหรือชื่อ"
              className="w-full pl-9 pr-3 py-2 text-2xl border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-navy-500"
            />
          </div>
          <select aria-label="กรองตามสถานะ" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full text-2xl border border-gray-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-navy-500">
            <option value="all">ทุกสถานะ</option>
            {['ใหม่', 'รอดำเนินการ', 'รอภาพ', 'อนุมัติ', 'ส่งแล้ว', 'ได้รับแล้ว', 'ปฏิเสธ'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(req => (
            <button
              key={req.id}
              onClick={() => setSelectedId(req.id)}
              className={`w-full text-left p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${selectedId === req.id ? 'bg-blue-50 border-l-2 border-l-navy-700' : ''}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xl text-navy-700">{req.reqNo}</span>
                <StatusBadge status={req.status} />
              </div>
              <p className="text-2xl text-gray-800 font-medium">{req.citizenName}</p>
              <p className="text-xl text-navy-700 truncate">{req.incidentLocation}</p>
              <p className="text-xl text-navy-700 mt-0.5">{formatThaiDate(req.submittedAt)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Detail */}
      {selected ? (
        <div className="flex-1 overflow-y-auto p-5">
          <div className="max-w-2xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-3xl font-bold text-navy-700 flex items-center gap-2"><Hash size={26} /> {selected.reqNo}</h2>
                <p className="text-xl text-navy-700">ยื่นเมื่อ {formatThaiDateTime(selected.submittedAt)}</p>
              </div>
              <StatusBadge status={selected.status} />
            </div>

            <div className="card p-4 mb-4">
              <h3 className="font-bold text-navy-700 mb-3 text-3xl flex items-center gap-2"><User size={22} /> ข้อมูลผู้ขอ</h3>
              <div className="grid grid-cols-2 gap-3 text-2xl">
                {[
                  ['ชื่อ-นามสกุล', selected.citizenName],
                  ['เลขบัตรประชาชน', selected.idCard],
                  ['โทรศัพท์', selected.phone],
                  ['อีเมล', selected.email],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xl text-navy-700 font-bold">{k}</p>
                    <p className="font-medium text-navy-700">{v}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-4 mb-4">
              <h3 className="font-bold text-navy-700 mb-3 text-3xl flex items-center gap-2"><FileText size={22} /> รายละเอียดคำขอ</h3>
              <div className="space-y-2 text-2xl">
                {[
                  ['สถานที่เกิดเหตุ', selected.incidentLocation],
                  ['ช่วงเวลา', `${selected.startDatetime} ถึง ${selected.endDatetime}`],
                  ['วัตถุประสงค์', selected.purpose],
                  ['รายละเอียด', selected.description],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-3 py-1.5 border-b border-gray-50">
                    <span className="text-navy-700 w-32 flex-shrink-0 font-bold">{k}:</span>
                    <span className="text-gray-800 font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {selected.status === 'ปฏิเสธ' ? (
              <div className="card p-4 mb-4 bg-red-50 border-red-200">
                <h3 className="font-bold text-red-800 mb-2 text-3xl flex items-center gap-2"><AlertTriangle size={22} /> ปฏิเสธคำขอ</h3>
                <p className="text-2xl text-red-700">{selected.rejectionReason}</p>
              </div>
            ) : (
              <CameraAssignPanel key={selected.id} req={selected} onSaved={detail => { logAudit(user, 'edit', 'portal', detail); refresh(); }} />
            )}

            <div className="card p-4 mb-4">
              <h3 className="font-bold text-navy-700 mb-3 text-3xl flex items-center gap-2"><Activity size={22} /> ความคืบหน้า</h3>
              {STATUS_STEPS.map((stepLabel, i) => {
                const tl = selected.timeline?.find(t => t.step === stepLabel);
                const completedCount = selected.timeline?.filter(t => t.completed).length ?? 0;
                const isDone = tl?.completed;
                const isCurrent = !isDone && i === completedCount;
                return (
                  <div key={stepLabel} className="flex items-center gap-3 mb-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xl font-bold ${isDone ? 'bg-green-500 text-white' : isCurrent ? 'bg-navy-700 text-white' : 'bg-gray-100 text-gray-400'}`}>
                      {isDone ? '✓' : i + 1}
                    </div>
                    <span className={`text-2xl flex-1 font-bold ${isDone ? 'text-green-700' : isCurrent ? 'text-navy-700' : 'text-gray-400'}`}>{stepLabel}</span>
                    {tl?.timestamp && <span className="text-xl text-navy-700">{formatThaiDate(tl.timestamp)}</span>}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2">
              {selected.status === 'ใหม่' && (
                <button onClick={() => updateStatus(selected.id, 'รอดำเนินการ', 'ตรวจสอบข้อมูล')} className="btn-primary">ตรวจสอบ</button>
              )}
              {selected.status === 'รอดำเนินการ' && (
                <>
                  <button onClick={() => updateStatus(selected.id, 'อนุมัติ', 'พิจารณาอนุมัติ')} className="btn-primary">อนุมัติ</button>
                  <button onClick={() => setRejectOpen(true)} className="btn-danger">ปฏิเสธ</button>
                </>
              )}
              {selected.status === 'อนุมัติ' && (
                <button onClick={() => updateStatus(selected.id, 'รอภาพ', 'จัดเตรียมข้อมูล')} className="btn-primary">เตรียมภาพ</button>
              )}
              {selected.status === 'รอภาพ' && (
                <button onClick={() => setSendOpen(true)} className="btn-primary">ส่งข้อมูลแล้ว</button>
              )}
              {selected.status === 'ส่งแล้ว' && (
                <button onClick={() => updateStatus(selected.id, 'ได้รับแล้ว')} className="btn-secondary">ยืนยันรับข้อมูล</button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <FileText size={56} className="mx-auto mb-2 opacity-30" />
            <p className="text-3xl">เลือกคำขอเพื่อดูรายละเอียด</p>
          </div>
        </div>
      )}

      <RejectModal isOpen={rejectOpen} onClose={() => setRejectOpen(false)} onConfirm={confirmReject} />
      {selected && (
        <SendVideoModal
          key={selected.id}
          isOpen={sendOpen}
          onClose={() => setSendOpen(false)}
          defaultFileName={`${selected.reqNo}.mp4`}
          defaultExpiryDays={savedSystemSettings().videoRetentionDays}
          onConfirm={confirmSend}
        />
      )}
    </div>
  );
}

export function CitizenPortalPage() {
  const { isCitizen } = useAuth();

  if (isCitizen) return <CitizenView />;

  return (
    <Layout>
      <div className="h-full flex flex-col">
        <div className="bg-white border-b border-gray-200 px-5 py-3">
          <h2 className="text-3xl font-bold text-navy-700 flex items-center gap-2"><CameraIcon size={26} /> ระบบคำขอดูกล้อง CCTV</h2>
          <p className="text-3xl text-navy-700">จัดการคำขอประชาชน</p>
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          <StaffView />
        </div>
      </div>
    </Layout>
  );
}
