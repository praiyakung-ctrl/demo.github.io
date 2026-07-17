import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Clock, FileText, Hash, Inbox, MapPin, Plus, Search, Target, User, Activity, Camera as CameraIcon } from 'lucide-react';
import { Layout, SkipLink } from '../components/Layout';
import { Navbar } from '../components/Navbar';
import { CitizenFooter, CitizenHero, ServiceMenuChips, ServiceSidebar } from '../components/CitizenPortalUI';
import { StatusBadge } from '../components/Badge';
import { useAuth } from '../context/AuthContext';
import requestsData from '../data/requests.json';
import type { CitizenRequest, RequestStatus } from '../types';
import { formatThaiDate, formatThaiDateTime } from '../utils/formatDate';

const initialRequests = requestsData as CitizenRequest[];

const STATUS_STEPS = ['รับคำขอ', 'ตรวจสอบข้อมูล', 'พิจารณาอนุมัติ', 'จัดเตรียมข้อมูล', 'ส่งข้อมูล'];

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
              <MapPin size={22} className="text-navy-500 flex-shrink-0" /> {req.cameraId} · {req.cameraLocation}
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

function RequestDetail({ req, onBack }: { req: CitizenRequest; onBack: () => void }) {
  const completedSteps = req.timeline?.filter(t => t.completed).length ?? 0;
  const rows: [string, string][] = [
    ['กล้อง', `${req.cameraId} · ${req.cameraLocation}`],
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
  const [selectedReq, setSelectedReq] = useState<CitizenRequest | null>(null);
  const [requests] = useState<CitizenRequest[]>(
    initialRequests.filter(r => r.email === 'citizen@gmail.com').concat(
      initialRequests.filter(r => r.email !== 'citizen@gmail.com').slice(0, 2)
    )
  );

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
          {selectedReq
            ? <RequestDetail req={selectedReq} onBack={() => setSelectedReq(null)} />
            : <RequestList requests={requests} onSelect={setSelectedReq} />}
        </main>
      </div>

      <CitizenFooter />
    </div>
  );
}

/* ---------- Staff view (unchanged, old Layout) ---------- */

function StaffView() {
  const [requests, setRequests] = useState<CitizenRequest[]>(initialRequests);
  const [selected, setSelected] = useState<CitizenRequest | null>(requests[0]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = requests.filter(r => {
    const matchSearch = r.reqNo.includes(search) || r.citizenName.includes(search);
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const updateStatus = (id: string, newStatus: RequestStatus) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: newStatus } : null);
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
            {['ใหม่', 'รอดำเนินการ', 'รอภาพ', 'อนุมัติ', 'ส่งแล้ว', 'ได้รับแล้ว'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(req => (
            <button
              key={req.id}
              onClick={() => setSelected(req)}
              className={`w-full text-left p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${selected?.id === req.id ? 'bg-blue-50 border-l-2 border-l-navy-700' : ''}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xl text-navy-700">{req.reqNo}</span>
                <StatusBadge status={req.status} />
              </div>
              <p className="text-2xl text-gray-800 font-medium">{req.citizenName}</p>
              <p className="text-xl text-navy-700 truncate">{req.cameraLocation}</p>
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
                  ['กล้อง', `${selected.cameraId} · ${selected.cameraLocation}`],
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
                <button onClick={() => updateStatus(selected.id, 'รอดำเนินการ')} className="btn-primary">ตรวจสอบ</button>
              )}
              {selected.status === 'รอดำเนินการ' && (
                <>
                  <button onClick={() => updateStatus(selected.id, 'อนุมัติ')} className="btn-primary">อนุมัติ</button>
                  <button onClick={() => updateStatus(selected.id, 'ปฏิเสธ')} className="btn-danger">ปฏิเสธ</button>
                </>
              )}
              {selected.status === 'อนุมัติ' && (
                <button onClick={() => updateStatus(selected.id, 'รอภาพ')} className="btn-primary">เตรียมภาพ</button>
              )}
              {selected.status === 'รอภาพ' && (
                <button onClick={() => updateStatus(selected.id, 'ส่งแล้ว')} className="btn-primary">ส่งข้อมูลแล้ว</button>
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
