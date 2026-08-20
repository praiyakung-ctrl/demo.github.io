import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, Marker } from 'react-leaflet';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  AlertTriangle, ChevronLeft, Clock, Download, FileText, Hash, Inbox, Mail, MapPin,
  Plus, Search, Target, User, Activity, Camera as CameraIcon,
  CheckCircle, AlertCircle, XCircle, Filter, Paperclip, BarChart3,
} from 'lucide-react';
import { Layout, SkipLink } from '../components/Layout';
import { Navbar } from '../components/Navbar';
import { CitizenFooter, CitizenHero, ServiceMenuChips, ServiceSidebar } from '../components/CitizenPortalUI';
import { StatusBadge } from '../components/Badge';
import { Pagination } from '../components/Pagination';
import { BaseTileLayer } from '../components/BaseTileLayer';
import { SatelliteToggleButton } from '../components/SatelliteToggleButton';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import camerasData from '../data/cameras.json';
import type { ApprovalLevel, Camera, CitizenRequest, RequestApproval, RequestStatus, TimelineEntry, VideoLink } from '../types';
import { formatThaiDate, formatThaiDateTime } from '../utils/formatDate';
import { generateDownloadToken, savedRequests, updateRequest } from '../utils/requestStorage';
import { logAudit } from '../utils/auditLog';
import { nearestCameras } from '../utils/geo';
import { pinIcon } from '../utils/mapPin';
import { APPROVAL_LEVEL_LABEL, NEXT_APPROVAL_STATUS, approverNamesAtLevel, currentApprovalLevelOf, isApproverAtLevel } from '../utils/cctvApprovers';
import { sendCctvApprovalPendingEmail, sendCctvRequestApprovedEmail, sendCctvRequestRejectedEmail, sendCctvVideoReadyEmail } from '../utils/emailApi';

const allCameras = camerasData as Camera[];

const STATUS_STEPS = ['รับคำขอ', 'ตรวจสอบข้อมูล', 'พิจารณาอนุมัติ', 'จัดเตรียมข้อมูล', 'ส่งข้อมูล'];

const ALL_STATUSES: RequestStatus[] = [
  'ใหม่', 'รอดำเนินการ', 'รอหัวหน้างานอนุมัติ', 'รอผู้บริหารอนุมัติ', 'อนุมัติ', 'รอภาพ', 'ส่งแล้ว', 'ได้รับแล้ว', 'ปฏิเสธ',
];

const MONTHS_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const PAGE_SIZE = 10;

type StatGroup = 'ใหม่' | 'รอดำเนินการ' | 'อนุมัติแล้ว' | 'ปฏิเสธ';

const STATUS_GROUP: Record<RequestStatus, StatGroup> = {
  'ใหม่': 'ใหม่',
  'รอดำเนินการ': 'รอดำเนินการ',
  'รอหัวหน้างานอนุมัติ': 'รอดำเนินการ',
  'รอผู้บริหารอนุมัติ': 'รอดำเนินการ',
  'รอภาพ': 'รอดำเนินการ',
  'อนุมัติ': 'อนุมัติแล้ว',
  'ส่งแล้ว': 'อนุมัติแล้ว',
  'ได้รับแล้ว': 'อนุมัติแล้ว',
  'ปฏิเสธ': 'ปฏิเสธ',
};

const STAT_GROUPS: StatGroup[] = ['อนุมัติแล้ว', 'รอดำเนินการ', 'ใหม่', 'ปฏิเสธ'];

const STAT_GROUP_COLORS: Record<StatGroup, string> = {
  'อนุมัติแล้ว': '#22C55E',
  'รอดำเนินการ': '#3B82F6',
  'ใหม่': '#94A3B8',
  'ปฏิเสธ': '#EF4444',
};

const DOC_SLOT_LABELS: { key: 'idCard' | 'policeReport' | 'other'; label: string }[] = [
  { key: 'idCard', label: 'สำเนาบัตรประจำตัวประชาชน' },
  { key: 'policeReport', label: 'ใบแจ้งความ / บันทึกประจำวัน' },
  { key: 'other', label: 'เอกสารประกอบอื่นๆ' },
];

/* demo-only preview images for the sample request, keyed by reqNo — real
   submissions never have actual scanned files, only the mock filename */
const DOCUMENT_PREVIEW_IMAGES: Record<string, Partial<Record<'idCard' | 'policeReport' | 'other', string>>> = {
  'REQ-260520-0017': {
    idCard: `${import.meta.env.BASE_URL}document/ตย.บัตรประชาชน.png`,
    policeReport: `${import.meta.env.BASE_URL}document/ตย.ใบแจ้งความ.png`,
    other: `${import.meta.env.BASE_URL}document/ตย.หนังสือมอบอำนาจ.png`,
  },
};

function markStep(timeline: TimelineEntry[], step: string): TimelineEntry[] {
  const now = new Date().toISOString();
  return timeline.map(t => (t.step === step ? { ...t, completed: true, timestamp: now } : t));
}

function ApprovalHistory({ approvals }: { approvals?: RequestApproval[] }) {
  if (!approvals || approvals.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {approvals.map((a, i) => (
        <div key={i} className={`flex items-center gap-2 text-lg ${a.decision === 'approved' ? 'text-green-700' : 'text-red-700'}`}>
          <span className="font-bold">ระดับ {a.level} ({APPROVAL_LEVEL_LABEL[a.level]}):</span>
          <span>{a.decision === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'} โดย {a.approverName}</span>
          <span className="text-gray-400">· {formatThaiDateTime(a.decidedAt)}</span>
          {a.comment && <span className="text-gray-500">— {a.comment}</span>}
        </div>
      ))}
    </div>
  );
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
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const links = req.videoLinks ?? [];
  if ((req.status !== 'ส่งแล้ว' && req.status !== 'ได้รับแล้ว') || links.length === 0) return null;

  const handleDownload = async (link: VideoLink) => {
    setDownloadingId(link.id);
    await new Promise(r => setTimeout(r, 600));
    if (req.status === 'ส่งแล้ว') updateRequest(req.id, { status: 'ได้รับแล้ว' });
    logAudit(user, 'download', 'portal', `ดาวน์โหลดไฟล์วิดีโอ ${link.fileName} คำขอ ${req.reqNo}`);
    setDownloadingId(null);
    onDownloaded();
  };

  return (
    <div className="rounded-xl bg-green-50 border border-green-200 p-4 space-y-3">
      <p className="text-xl font-bold text-green-800">ไฟล์วิดีโอพร้อมดาวน์โหลด ({links.length} ไฟล์)</p>
      <div className="space-y-2">
        {links.map(link => {
          const expired = new Date() > new Date(link.expiresAt);
          return (
            <div key={link.id} className="flex items-center justify-between gap-3 bg-white rounded-lg border border-green-100 px-3 py-2">
              <div className="min-w-0">
                <p className="text-lg font-bold text-gray-800 truncate">{link.fileName}</p>
                <p className="text-sm text-gray-500">
                  {(link.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB · {expired ? 'หมดอายุแล้ว' : `หมดอายุ ${formatThaiDate(link.expiresAt)}`}
                </p>
              </div>
              {expired ? (
                <span className="text-sm font-bold text-red-600 flex-shrink-0">หมดอายุ</span>
              ) : (
                <button
                  onClick={() => handleDownload(link)}
                  disabled={downloadingId === link.id}
                  className="btn-primary flex items-center gap-1.5 text-base py-1.5 px-3 flex-shrink-0 disabled:opacity-60"
                >
                  <Download size={16} /> {downloadingId === link.id ? 'กำลังดาวน์โหลด...' : 'ดาวน์โหลด'}
                </button>
              )}
            </div>
          );
        })}
      </div>
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

      {req.approvals && req.approvals.length > 0 && (
        <section className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
            <h3 className="text-2xl font-bold text-navy-700 flex items-center gap-2"><User size={22} /> ผู้อนุมัติแต่ละระดับ</h3>
          </div>
          <div className="px-4 py-3">
            <ApprovalHistory approvals={req.approvals} />
          </div>
        </section>
      )}
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

const MAX_VIDEO_BYTES = 45 * 1024 * 1024;
const VIDEO_EXPIRY_OPTIONS = [
  { label: '90 วัน', days: 90 },
  { label: '1 ปี', days: 365 },
];

/* re-mounted via `key` each time it opens (see openVideoModal in StaffView) so
   this local state always starts from the request's current videoLinks —
   avoids syncing props into state via an effect */
function VideoLinksModal({ isOpen, onClose, existingLinks, uploadedBy, onConfirm }: {
  isOpen: boolean;
  onClose: () => void;
  existingLinks: VideoLink[];
  uploadedBy: string;
  onConfirm: (links: VideoLink[]) => void;
}) {
  const [links, setLinks] = useState<VideoLink[]>(existingLinks);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [expiryDays, setExpiryDays] = useState(90);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePickFile = (file: File | undefined) => {
    setError('');
    if (!file) { setPendingFile(null); return; }
    if (file.size > MAX_VIDEO_BYTES) {
      setError('ไฟล์มีขนาดเกิน 45MB กรุณาเลือกไฟล์อื่น');
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setPendingFile(file);
  };

  const addLink = () => {
    if (!pendingFile) return;
    const expiresAt = new Date(Date.now() + expiryDays * 86_400_000).toISOString();
    setLinks(ls => [...ls, {
      id: `vl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fileName: pendingFile.name,
      fileSizeBytes: pendingFile.size,
      expiresAt,
      uploadedAt: new Date().toISOString(),
      uploadedBy,
    }]);
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeLink = (id: string) => setLinks(ls => ls.filter(l => l.id !== id));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="จัดการลิงก์วิดีโอ" icon={<Mail size={20} className="text-white" />} size="lg">
      <div className="space-y-4">
        {links.length > 0 && (
          <div className="space-y-1.5">
            {links.map(link => (
              <div key={link.id} className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <p className="text-lg font-bold text-gray-800 truncate">{link.fileName}</p>
                  <p className="text-sm text-gray-500">
                    {(link.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB · หมดอายุ {formatThaiDate(link.expiresAt)}
                  </p>
                </div>
                <button type="button" onClick={() => removeLink(link.id)} className="text-sm text-red-600 hover:underline flex-shrink-0">ลบ</button>
              </div>
            ))}
          </div>
        )}

        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-3">
          <p className="text-lg font-bold text-navy-700">เพิ่มลิงก์วิดีโอ</p>
          <div>
            <label htmlFor="video-file-input" className="label">ไฟล์วิดีโอที่ตัดแล้ว (ไม่เกิน 45MB)</label>
            <input
              id="video-file-input" ref={fileInputRef} type="file" accept="video/*"
              onChange={e => handlePickFile(e.target.files?.[0])}
              className="block w-full text-lg text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-navy-700 file:text-white file:font-bold"
            />
            {error && <p role="alert" className="text-base text-red-600 mt-1">{error}</p>}
          </div>
          <div>
            <label htmlFor="video-expiry" className="label">ระยะเวลาที่ประชาชนดาวน์โหลดได้</label>
            <select id="video-expiry" value={expiryDays} onChange={e => setExpiryDays(Number(e.target.value))} className="input-field">
              {VIDEO_EXPIRY_OPTIONS.map(o => <option key={o.days} value={o.days}>{o.label}</option>)}
            </select>
          </div>
          <button type="button" onClick={addLink} disabled={!pendingFile} className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed">
            เพิ่มลิงก์
          </button>
        </div>

        <p className="text-lg text-gray-500 flex items-start gap-2">
          <Mail size={18} className="flex-shrink-0 mt-0.5" />
          ระบบจะส่งอีเมลแจ้งเตือนประชาชนพร้อมลิงก์เข้าสู่ระบบอัตโนมัติให้เข้ามาดาวน์โหลดไฟล์เอง
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">ยกเลิก</button>
          <button onClick={() => onConfirm(links)} disabled={links.length === 0} className="btn-primary disabled:opacity-40">
            บันทึกและแจ้งเตือนผู้ร้องขอ
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
  const [satellite, setSatellite] = useState(false);

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
    <div className="border border-gray-200 rounded-xl p-4">
      <h3 className="font-bold text-navy-700 mb-3 text-2xl flex items-center gap-2"><MapPin size={20} /> มอบหมายกล้อง CCTV</h3>
      <p className="text-xl text-navy-700 mb-3">
        ละจิจูด {req.incidentLat.toFixed(4)}, ลองจิจูด {req.incidentLng.toFixed(4)}
      </p>
      <div className="rounded-xl overflow-hidden border border-gray-200 h-[260px] relative z-0 mb-3">
        <MapContainer key={req.id} center={[req.incidentLat, req.incidentLng]} zoom={16} className="w-full h-full">
          <BaseTileLayer satellite={satellite} />
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
        <SatelliteToggleButton satellite={satellite} onToggle={() => setSatellite(s => !s)} className="absolute bottom-2 right-2 z-[500]" />
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

/* ---------- Staff right sidebar: progress timeline + stats ---------- */

function ProgressTimeline({ req }: { req: CitizenRequest }) {
  const completedCount = req.timeline?.filter(t => t.completed).length ?? 0;
  return (
    <div className="card p-4">
      <h3 className="font-bold text-navy-700 mb-3 text-2xl flex items-center gap-2"><Activity size={20} /> ความคืบหน้า</h3>
      <div>
        {STATUS_STEPS.map((stepLabel, i) => {
          const tl = req.timeline?.find(t => t.step === stepLabel);
          const isDone = tl?.completed;
          const isCurrent = !isDone && i === completedCount;
          return (
            <div key={stepLabel} className="flex items-stretch gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0 ${
                  isDone ? 'bg-green-500 text-white' : isCurrent ? 'bg-navy-700 text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  {isDone ? '✓' : i + 1}
                </div>
                {i < STATUS_STEPS.length - 1 && <div className="w-0.5 flex-1 min-h-[18px] bg-gray-200 my-0.5" />}
              </div>
              <div className="pt-0.5 pb-3 min-w-0">
                <p className={`text-lg font-bold leading-tight ${isDone ? 'text-green-700' : isCurrent ? 'text-navy-700' : 'text-gray-400'}`}>
                  {stepLabel}
                </p>
                {tl?.timestamp && <p className="text-base text-gray-500">{formatThaiDateTime(tl.timestamp)}</p>}
              </div>
            </div>
          );
        })}
      </div>
      {req.approvals && req.approvals.length > 0 && (
        <div className="pt-2 mt-1 border-t border-gray-100">
          <ApprovalHistory approvals={req.approvals} />
        </div>
      )}
    </div>
  );
}

const STATS_PERIODS = ['เดือนนี้', 'ทั้งหมด'] as const;

function RequestStatsPanel({ requests }: { requests: CitizenRequest[] }) {
  const [period, setPeriod] = useState<typeof STATS_PERIODS[number]>('ทั้งหมด');
  const now = new Date();
  const scoped = period === 'เดือนนี้'
    ? requests.filter(r => {
        const d = new Date(r.submittedAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
    : requests;

  const counts: Record<StatGroup, number> = { 'ใหม่': 0, 'รอดำเนินการ': 0, 'อนุมัติแล้ว': 0, 'ปฏิเสธ': 0 };
  scoped.forEach(r => { counts[STATUS_GROUP[r.status]]++; });
  const total = scoped.length;
  const data = STAT_GROUPS.map(key => ({ key, count: counts[key], pct: total > 0 ? (counts[key] / total) * 100 : 0 }));

  const tiles: { label: string; count: number; icon: typeof FileText; cls: string }[] = [
    { label: 'ทั้งหมด', count: total, icon: FileText, cls: 'text-navy-700 bg-navy-50' },
    { label: 'อนุมัติแล้ว', count: counts['อนุมัติแล้ว'], icon: CheckCircle, cls: 'text-green-700 bg-green-50' },
    { label: 'รอตรวจสอบ', count: counts['รอดำเนินการ'], icon: AlertCircle, cls: 'text-blue-700 bg-blue-50' },
    { label: 'ปฏิเสธ', count: counts['ปฏิเสธ'], icon: XCircle, cls: 'text-red-700 bg-red-50' },
  ];

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-navy-700 text-2xl flex items-center gap-2"><BarChart3 size={20} /> สถิติคำขอ</h3>
        <select
          aria-label="ช่วงเวลาสถิติคำขอ"
          value={period}
          onChange={e => setPeriod(e.target.value as typeof STATS_PERIODS[number])}
          className="text-base border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-navy-500"
        >
          {STATS_PERIODS.map(p => <option key={p}>{p}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative w-[132px] h-[132px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="count" nameKey="key" innerRadius={42} outerRadius={62} strokeWidth={0}>
                {data.map(d => <Cell key={d.key} fill={STAT_GROUP_COLORS[d.key]} />)}
              </Pie>
              <Tooltip formatter={(v) => [`${Number(v)} คำขอ`]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-sm text-gray-400">ทั้งหมด</span>
            <span className="text-2xl font-bold text-navy-700">{total}</span>
            <span className="text-sm text-gray-400">คำขอ</span>
          </div>
        </div>
        <div className="flex-1 space-y-1.5 min-w-0">
          {data.map(d => (
            <div key={d.key} className="flex items-center justify-between text-base gap-2">
              <span className="flex items-center gap-1.5 text-gray-700 truncate">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STAT_GROUP_COLORS[d.key] }} />
                {d.key}
              </span>
              <span className="font-bold text-gray-800 flex-shrink-0">{d.count} ({d.pct.toFixed(1)}%)</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {tiles.map(t => (
          <div key={t.label} className={`rounded-xl border border-gray-100 p-3 ${t.cls}`}>
            <div className="flex items-center gap-2 mb-1"><t.icon size={18} /><span className="text-base font-bold">{t.label}</span></div>
            <p className="text-2xl font-bold">{t.count} <span className="text-base font-normal">คำขอ</span></p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StaffView() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CitizenRequest[]>(() => savedRequests());
  const [selectedId, setSelectedId] = useState<string | null>(() => savedRequests()[0]?.id ?? null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState(String(new Date().getMonth() + 1));
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));
  const [page, setPage] = useState(1);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoModalKey, setVideoModalKey] = useState(0);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; label: string } | null>(null);

  const refresh = () => setRequests(savedRequests());
  const selected = selectedId ? requests.find(r => r.id === selectedId) ?? null : null;
  const selectedLevel = selected ? currentApprovalLevelOf(selected.status) : null;
  const canActOnSelectedLevel = selectedLevel !== null && Boolean(
    user && (user.role === 'admin' || isApproverAtLevel(user.id, selectedLevel))
  );

  const years = [...new Set(requests.map(r => new Date(r.submittedAt).getFullYear()))].sort((a, b) => b - a);

  const filtered = requests.filter(r => {
    const submitted = new Date(r.submittedAt);
    const matchSearch = r.reqNo.includes(search) || r.citizenName.includes(search);
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchMonth = monthFilter === 'all' || submitted.getMonth() + 1 === Number(monthFilter);
    const matchYear = yearFilter === 'all' || submitted.getFullYear() === Number(yearFilter);
    return matchSearch && matchStatus && matchMonth && matchYear;
  });
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const applyFilter = (setter: (v: string) => void) => (value: string) => { setter(value); setPage(1); };

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

  /* "ตรวจสอบ" claims a brand-new request into level-1's queue and notifies level-1 approvers */
  const handleClaim = (req: CitizenRequest) => {
    updateStatus(req.id, 'รอดำเนินการ', 'ตรวจสอบข้อมูล');
    approverNamesAtLevel(1).forEach(a => sendCctvApprovalPendingEmail(a.email, a.name, req.reqNo, 1));
  };

  const handleApproveLevel = (req: CitizenRequest, level: ApprovalLevel) => {
    if (!user) return;
    const approval: RequestApproval = {
      level, approverId: user.id, approverName: user.name, decision: 'approved', decidedAt: new Date().toISOString(),
    };
    const nextStatus = NEXT_APPROVAL_STATUS[level];
    const patch: Partial<CitizenRequest> = { status: nextStatus, approvals: [...(req.approvals ?? []), approval] };
    if (level === 3) patch.timeline = markStep(req.timeline, 'พิจารณาอนุมัติ');
    mutate(req.id, patch, `อนุมัติคำขอ ${req.reqNo} ระดับ ${level} (${APPROVAL_LEVEL_LABEL[level]}) โดย ${user.name}`);

    if (level < 3) {
      const nextLevel = (level + 1) as ApprovalLevel;
      approverNamesAtLevel(nextLevel).forEach(a => sendCctvApprovalPendingEmail(a.email, a.name, req.reqNo, nextLevel));
    } else {
      sendCctvRequestApprovedEmail(req.email, req.citizenName, req.reqNo);
    }
  };

  const confirmReject = (reason: string) => {
    if (!selected || !reason || !user) return;
    const level = currentApprovalLevelOf(selected.status);
    const approvals = level
      ? [...(selected.approvals ?? []), {
          level, approverId: user.id, approverName: user.name, decision: 'rejected' as const, comment: reason, decidedAt: new Date().toISOString(),
        }]
      : selected.approvals;
    mutate(selected.id, { status: 'ปฏิเสธ', rejectionReason: reason, approvals }, `ปฏิเสธคำขอ ${selected.reqNo}${level ? ` ที่ระดับ ${level} (${APPROVAL_LEVEL_LABEL[level]})` : ''}: ${reason}`);
    sendCctvRequestRejectedEmail(selected.email, selected.citizenName, reason);
    setRejectOpen(false);
  };

  const openVideoModal = () => {
    setVideoModalKey(k => k + 1);
    setVideoModalOpen(true);
  };

  const confirmVideoLinks = (links: VideoLink[]) => {
    if (!selected || !user) return;
    const token = selected.downloadToken ?? generateDownloadToken();
    const patch: Partial<CitizenRequest> = { videoLinks: links, downloadToken: token };
    if (selected.status === 'รอภาพ') {
      patch.status = 'ส่งแล้ว';
      patch.timeline = markStep(selected.timeline, 'ส่งข้อมูล');
    }
    mutate(selected.id, patch, `บันทึกลิงก์วิดีโอคำขอ ${selected.reqNo} (${links.length} ไฟล์) แจ้งเตือนทางอีเมลแล้ว`);

    const magicLink = `${window.location.origin}${import.meta.env.BASE_URL}video-access?token=${token}`;
    sendCctvVideoReadyEmail(selected.email, selected.citizenName, selected.reqNo, magicLink, links.length);
    setVideoModalOpen(false);
  };

  return (
    <div className="flex flex-col xl:flex-row h-full min-h-0">
      {/* Inbox list — shown alone below xl until a request is picked, then swaps to the detail pane */}
      <div className={`${selected ? 'hidden' : 'flex'} xl:flex w-full xl:w-96 xl:flex-shrink-0 border-b xl:border-b-0 xl:border-r border-gray-200 flex-col bg-white`}>
        <div className="p-3 border-b border-gray-100 space-y-2">
          <h2 className="font-bold text-navy-700 mb-1 text-3xl flex items-center gap-2"><Inbox size={24} /> คำขอประชาชน ({filtered.length})</h2>
          <div className="relative">
            <Search size={20} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => applyFilter(setSearch)(e.target.value)}
              placeholder="ค้นหาเลขที่คำขอ, ชื่อผู้ขอ, สถานที่..."
              aria-label="ค้นหาคำขอด้วยเลขที่คำขอหรือชื่อ"
              className="w-full pl-9 pr-3 py-2 text-2xl border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-navy-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              aria-label="กรองตามเดือน"
              value={monthFilter}
              onChange={e => applyFilter(setMonthFilter)(e.target.value)}
              className="flex-1 min-w-0 text-xl border border-gray-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-navy-500"
            >
              <option value="all">เดือน</option>
              {MONTHS_TH.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
            </select>
            <select
              aria-label="กรองตามปี"
              value={yearFilter}
              onChange={e => applyFilter(setYearFilter)(e.target.value)}
              className="w-28 flex-shrink-0 text-xl border border-gray-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-navy-500"
            >
              <option value="all">ปี</option>
              {years.map(y => <option key={y} value={y}>{y + 543}</option>)}
            </select>
          </div>
          <div className="relative">
            <Filter size={18} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              aria-label="กรองตามสถานะ"
              value={statusFilter}
              onChange={e => applyFilter(setStatusFilter)(e.target.value)}
              className="w-full pl-9 text-xl border border-gray-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-navy-500"
            >
              <option value="all">สถานะทั้งหมด</option>
              {ALL_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="flex-1 xl:overflow-y-auto">
          {paged.map(req => (
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
          {filtered.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <Inbox size={40} className="mx-auto mb-2 opacity-40" />
              <p className="text-xl">ไม่พบคำขอตามเงื่อนไข</p>
            </div>
          )}
        </div>
        <Pagination total={filtered.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>

      {/* Detail + sidebar — shown together below xl only once a request is picked; always shown side-by-side at xl+ */}
      <div className={`${selected ? 'flex' : 'hidden'} xl:flex flex-1 min-w-0 flex-col xl:flex-row xl:h-full xl:min-h-0`}>
      {selected ? (
        <div className="flex-1 min-w-0 xl:overflow-y-auto p-5">
          <button
            onClick={() => setSelectedId(null)}
            className="xl:hidden flex items-center gap-1 text-xl font-bold text-navy-700 hover:text-navy-500 mb-3"
          >
            <ChevronLeft size={22} /> กลับไปหน้ารายการ
          </button>
          <div className="max-w-3xl space-y-4">
            <div className="card p-4">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-bold text-navy-700 text-2xl flex items-center gap-2">
                  <FileText size={20} /> รายละเอียดคำขอ
                  <span className="text-lg text-gray-400 font-normal ml-1">{selected.reqNo}</span>
                </h3>
                <StatusBadge status={selected.status} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xl">
                <div>
                  <p className="text-navy-700 font-bold mb-0.5">สถานที่เกิดเหตุ</p>
                  <p className="text-gray-800 font-medium">{selected.incidentLocation}</p>
                </div>
                <div>
                  <p className="text-navy-700 font-bold mb-0.5">ผู้ยื่น</p>
                  <p className="text-gray-800 font-medium">{selected.citizenName}</p>
                </div>
                <div>
                  <p className="text-navy-700 font-bold mb-0.5">ช่วงเวลา</p>
                  <p className="text-gray-800 font-medium">{selected.startDatetime} ถึง {selected.endDatetime}</p>
                </div>
                <div>
                  <p className="text-navy-700 font-bold mb-0.5">เบอร์โทรศัพท์</p>
                  <p className="text-gray-800 font-medium">{selected.phone}</p>
                </div>
                <div>
                  <p className="text-navy-700 font-bold mb-0.5">วัตถุประสงค์</p>
                  <p className="text-gray-800 font-medium">{selected.purpose}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-navy-700 font-bold mb-0.5">อีเมล</p>
                  <p className="text-gray-800 font-medium truncate">{selected.email}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-navy-700 font-bold mb-0.5">รายละเอียด</p>
                  <p className="text-gray-800 font-medium">{selected.description || '-'}</p>
                </div>
              </div>
              <p className="text-lg text-gray-400 mt-3 pt-3 border-t border-gray-50">
                สร้างเมื่อ {formatThaiDateTime(selected.submittedAt)}
              </p>
            </div>

            <div className="card p-4">
              <h3 className="font-bold text-navy-700 mb-3 text-2xl flex items-center gap-2">
                <Paperclip size={20} />
                เอกสารแนบ ({DOC_SLOT_LABELS.filter(s => selected.documents?.[s.key]).length} รายการ)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {DOC_SLOT_LABELS.map(slot => {
                  const fileName = selected.documents?.[slot.key];
                  const previewUrl = DOCUMENT_PREVIEW_IMAGES[selected.reqNo]?.[slot.key];
                  const thumb = (
                    <div className="h-24 bg-gray-50 flex items-center justify-center overflow-hidden">
                      {previewUrl
                        ? <img src={previewUrl} alt={slot.label} className="w-full h-full object-cover" />
                        : <FileText size={30} className={fileName ? 'text-navy-500' : 'text-gray-300'} />}
                    </div>
                  );
                  const caption = (
                    <div className="px-2 py-1.5 border-t border-gray-100">
                      <p className="text-lg font-bold text-gray-700 truncate">{slot.label}</p>
                      <p className="text-base text-gray-400 truncate">{fileName ?? 'ไม่มีเอกสาร'}</p>
                    </div>
                  );
                  return previewUrl ? (
                    <button
                      key={slot.key}
                      onClick={() => setPreviewDoc({ url: previewUrl, label: slot.label })}
                      className="border border-gray-200 rounded-xl overflow-hidden text-left hover:border-navy-500 hover:shadow-md transition-all"
                    >
                      {thumb}
                      {caption}
                    </button>
                  ) : (
                    <div key={slot.key} className="border border-gray-200 rounded-xl overflow-hidden">
                      {thumb}
                      {caption}
                    </div>
                  );
                })}
              </div>
            </div>

            {selected.status === 'ปฏิเสธ' ? (
              <div className="card p-4 bg-red-50 border-red-200">
                <h3 className="font-bold text-red-800 mb-2 text-2xl flex items-center gap-2"><AlertTriangle size={20} /> ปฏิเสธคำขอ</h3>
                <p className="text-xl text-red-700">{selected.rejectionReason}</p>
              </div>
            ) : (
              <CameraAssignPanel key={selected.id} req={selected} onSaved={detail => { logAudit(user, 'edit', 'portal', detail); refresh(); }} />
            )}

            <div className="flex flex-wrap gap-2">
              {selected.status === 'ใหม่' && (
                <button onClick={() => handleClaim(selected)} className="btn-primary">ตรวจสอบ</button>
              )}
              {selectedLevel !== null && (
                canActOnSelectedLevel ? (
                  <>
                    <button onClick={() => handleApproveLevel(selected, selectedLevel)} className="btn-primary">
                      อนุมัติ (ระดับ {selectedLevel} — {APPROVAL_LEVEL_LABEL[selectedLevel]})
                    </button>
                    <button onClick={() => setRejectOpen(true)} className="btn-danger">ปฏิเสธ</button>
                  </>
                ) : (
                  <p className="text-lg text-gray-500 italic flex items-center">
                    รอผู้อนุมัติระดับ {selectedLevel} ({APPROVAL_LEVEL_LABEL[selectedLevel]}) ดำเนินการ
                  </p>
                )
              )}
              {selected.status === 'อนุมัติ' && (
                <button onClick={() => updateStatus(selected.id, 'รอภาพ', 'จัดเตรียมข้อมูล')} className="btn-primary">เตรียมภาพ</button>
              )}
              {(selected.status === 'รอภาพ' || selected.status === 'ส่งแล้ว' || selected.status === 'ได้รับแล้ว') && (
                <button onClick={openVideoModal} className="btn-primary">
                  {selected.status === 'รอภาพ' ? 'ส่งข้อมูลแล้ว' : 'จัดการลิงก์วิดีโอ'}
                </button>
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

      {/* Progress + stats sidebar */}
      <div className="w-full xl:w-[360px] xl:flex-shrink-0 border-t xl:border-t-0 xl:border-l border-gray-200 bg-[#F0F2F5] xl:overflow-y-auto p-4 space-y-4">
        {selected ? (
          <ProgressTimeline req={selected} />
        ) : (
          <div className="card p-8 text-center text-gray-400">
            <Activity size={40} className="mx-auto mb-2 opacity-30" />
            <p className="text-lg">เลือกคำขอเพื่อดูความคืบหน้า</p>
          </div>
        )}
        <RequestStatsPanel requests={requests} />
      </div>
      </div>

      <RejectModal isOpen={rejectOpen} onClose={() => setRejectOpen(false)} onConfirm={confirmReject} />
      {selected && user && (
        <VideoLinksModal
          key={videoModalKey}
          isOpen={videoModalOpen}
          onClose={() => setVideoModalOpen(false)}
          existingLinks={selected.videoLinks ?? []}
          uploadedBy={user.name}
          onConfirm={confirmVideoLinks}
        />
      )}
      <Modal isOpen={!!previewDoc} onClose={() => setPreviewDoc(null)} title={previewDoc?.label ?? ''} icon={<Paperclip size={20} className="text-white" />} size="lg">
        {previewDoc && <img src={previewDoc.url} alt={previewDoc.label} className="w-full rounded-lg" />}
      </Modal>
    </div>
  );
}

export function CitizenPortalPage() {
  const { isCitizen, isPolice, isLocalOfficer } = useAuth();

  if (isCitizen || isPolice || isLocalOfficer) return <CitizenView />;

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
