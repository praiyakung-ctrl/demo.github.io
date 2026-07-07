import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, ChevronRight, ChevronLeft, FileText, Clock, User, Search, Activity, Camera as CameraIcon, Inbox, Hash } from 'lucide-react';
import { Layout } from '../components/Layout';
import { StatusBadge } from '../components/Badge';
import { useAuth } from '../context/AuthContext';
import requestsData from '../data/requests.json';
import camerasData from '../data/cameras.json';
import type { CitizenRequest, Camera, RequestStatus } from '../types';
import { formatThaiDate, formatThaiDateTime } from '../utils/formatDate';

const initialRequests = requestsData as CitizenRequest[];
const cameras = camerasData as Camera[];

const STATUS_STEPS = ['รับคำขอ', 'ตรวจสอบข้อมูล', 'พิจารณาอนุมัติ', 'จัดเตรียมข้อมูล', 'ส่งข้อมูล'];


function CitizenView() {
  const { user } = useAuth();
  const [view, setView] = useState<'inbox' | 'new' | 'detail'>('inbox');
  const [step, setStep] = useState(1);
  const [selectedReq, setSelectedReq] = useState<CitizenRequest | null>(null);
  const [requests, setRequests] = useState<CitizenRequest[]>(
    initialRequests.filter(r => r.email === 'citizen@gmail.com').concat(
      initialRequests.filter(r => r.email !== 'citizen@gmail.com').slice(0, 2)
    )
  );
  const [submittedReqNo, setSubmittedReqNo] = useState<string | null>(null);

  const [form, setForm] = useState({
    citizenName: user?.name ?? '',
    idCard: '',
    phone: '',
    email: user?.email ?? '',
    cameraId: '',
    startDatetime: '',
    endDatetime: '',
    purpose: '',
    description: '',
  });

  const handleSubmit = () => {
    const newReq: CitizenRequest = {
      id: String(Date.now()),
      reqNo: `REQ-2026-${String(requests.length + 11).padStart(3, '0')}`,
      ...form,
      cameraLocation: cameras.find(c => c.id === form.cameraId)?.location ?? form.cameraId,
      status: 'ใหม่',
      submittedAt: new Date().toISOString(),
      timeline: STATUS_STEPS.map((s, i) => ({ step: s, completed: i === 0, timestamp: i === 0 ? new Date().toISOString() : undefined })),
    } as CitizenRequest;
    setRequests(prev => [newReq, ...prev]);
    setSubmittedReqNo(newReq.reqNo);
    setStep(4);
  };

  if (view === 'new') {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <button onClick={() => { setView('inbox'); setStep(1); }} className="flex items-center gap-1 text-2xl text-navy-700 hover:text-navy-500 mb-4">
          <ChevronLeft size={24} /> กลับ
        </button>
        <h2 className="text-5xl font-bold text-navy-700 mb-1">ยื่นคำขอดูกล้อง CCTV</h2>
        <p className="text-3xl text-navy-700 mb-4">กรอกข้อมูลให้ครบถ้วนเพื่อส่งคำขอ</p>

        {/* Steps indicator */}
        <div className="flex items-center gap-0 mb-6">
          {['กรอกข้อมูล', 'ตรวจสอบ', 'ยืนยัน'].map((s, i) => (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className={`flex items-center gap-2 ${i + 1 === step || (step === 4 && i === 2) ? 'text-navy-700' : step > i + 1 ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold ${
                  step > i + 1 || (step === 4 && i <= 1) ? 'bg-green-500 text-white' :
                  i + 1 === step || (step === 4 && i === 2) ? 'bg-navy-700 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                <span className="text-xl font-medium">{s}</span>
              </div>
              {i < 2 && <div className="flex-1 h-0.5 mx-2 bg-gray-200" />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="card p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">ชื่อ-นามสกุล *</label>
                <input value={form.citizenName} onChange={e => setForm(f => ({ ...f, citizenName: e.target.value }))} className="input-field" required />
              </div>
              <div>
                <label className="label">เลขบัตรประชาชน *</label>
                <input value={form.idCard} onChange={e => setForm(f => ({ ...f, idCard: e.target.value }))} placeholder="x-xxxx-xxxxx-xx-x" className="input-field" />
              </div>
              <div>
                <label className="label">โทรศัพท์ *</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="label">อีเมล</label>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input-field" />
              </div>
            </div>
            <div>
              <label className="label">ตำแหน่งกล้อง *</label>
              <select value={form.cameraId} onChange={e => setForm(f => ({ ...f, cameraId: e.target.value }))} className="input-field">
                <option value="">-- เลือกกล้อง --</option>
                {cameras.filter(c => c.status === 'Online').map(c => (
                  <option key={c.id} value={c.id}>{c.id} · {c.location}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">วันที่-เวลาเริ่ม *</label>
                <input type="datetime-local" value={form.startDatetime} onChange={e => setForm(f => ({ ...f, startDatetime: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="label">วันที่-เวลาสิ้นสุด *</label>
                <input type="datetime-local" value={form.endDatetime} onChange={e => setForm(f => ({ ...f, endDatetime: e.target.value }))} className="input-field" />
              </div>
            </div>
            <div>
              <label className="label">วัตถุประสงค์ *</label>
              <select value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} className="input-field">
                <option value="">-- เลือก --</option>
                <option>อุบัติเหตุ</option>
                <option>คดีความ</option>
                <option>อื่นๆ</option>
              </select>
            </div>
            <div>
              <label className="label">รายละเอียดเพิ่มเติม</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="input-field resize-none" />
            </div>
            <button
              onClick={() => { if (form.citizenName && form.cameraId && form.startDatetime && form.purpose) setStep(2); }}
              className="btn-primary w-full"
            >
              ถัดไป <ChevronRight size={20} className="inline" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="card p-5">
            <h3 className="font-bold text-navy-700 mb-4 text-3xl">ตรวจสอบข้อมูล</h3>
            <div className="space-y-2 text-3xl">
              {[
                ['ชื่อ-นามสกุล', form.citizenName],
                ['เลขบัตรประชาชน', form.idCard],
                ['โทรศัพท์', form.phone],
                ['อีเมล', form.email],
                ['กล้อง', `${form.cameraId} · ${cameras.find(c => c.id === form.cameraId)?.location ?? ''}`],
                ['ช่วงเวลา', `${form.startDatetime} – ${form.endDatetime}`],
                ['วัตถุประสงค์', form.purpose],
                ['รายละเอียด', form.description || '–'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3 py-2 border-b border-gray-50">
                  <span className="text-navy-700 w-48 flex-shrink-0 font-bold">{k}:</span>
                  <span className="text-navy-700 font-medium">{v}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setStep(1)} className="btn-secondary flex-1">แก้ไข</button>
              <button onClick={() => setStep(3)} className="btn-primary flex-1">ยืนยัน</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="card p-5 text-center">
            <h3 className="font-bold text-navy-700 mb-3 text-3xl">ยืนยันการส่งคำขอ</h3>
            <p className="text-3xl text-gray-600 mb-5">กด "ส่งคำขอ" เพื่อยืนยัน ระบบจะแจ้งสถานะผ่านอีเมล</p>
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="btn-secondary flex-1">กลับ</button>
              <button onClick={handleSubmit} className="btn-primary flex-1">ส่งคำขอ</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="card p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={40} className="text-green-600" />
            </div>
            <h3 className="text-5xl font-bold text-navy-700 mb-2">ส่งคำขอสำเร็จ!</h3>
            <p className="text-3xl text-gray-600 mb-1">หมายเลขคำขอของคุณ:</p>
            <p className="text-6xl font-bold text-navy-700 mb-4">{submittedReqNo}</p>
            <p className="text-3xl text-navy-700 mb-6">ระบบจะส่งอีเมลแจ้งเตือนเมื่อสถานะเปลี่ยนแปลง</p>
            <button onClick={() => { setView('inbox'); setStep(1); }} className="btn-primary">ดูสถานะคำขอ</button>
          </div>
        )}
      </div>
    );
  }

  if (view === 'detail' && selectedReq) {
    const completedSteps = selectedReq.timeline?.filter(t => t.completed).length ?? 0;
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <button onClick={() => setView('inbox')} className="flex items-center gap-1 text-2xl text-navy-700 hover:text-navy-500 mb-4">
          <ChevronLeft size={24} /> กลับ
        </button>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-3xl font-bold text-navy-700 flex items-center gap-2"><Hash size={26} /> {selectedReq.reqNo}</h2>
              <p className="text-xl text-navy-700">ยื่นเมื่อ {formatThaiDateTime(selectedReq.submittedAt)}</p>
            </div>
            <StatusBadge status={selectedReq.status} />
          </div>

          <div className="space-y-2 text-3xl mb-5">
            {[
              ['กล้อง', `${selectedReq.cameraId} · ${selectedReq.cameraLocation}`],
              ['ช่วงเวลา', `${selectedReq.startDatetime} – ${selectedReq.endDatetime}`],
              ['วัตถุประสงค์', selectedReq.purpose],
              ['รายละเอียด', selectedReq.description],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-3 py-1.5 border-b border-gray-50">
                <span className="text-navy-700 w-36 flex-shrink-0 font-bold">{k}:</span>
                <span className="text-gray-800">{v}</span>
              </div>
            ))}
          </div>

          <h3 className="font-bold text-navy-700 mb-3 text-3xl">สถานะการดำเนินการ</h3>
          <div className="space-y-3">
            {STATUS_STEPS.map((stepLabel, i) => {
              const tl = selectedReq.timeline?.find(t => t.step === stepLabel);
              const isDone = tl?.completed;
              const isCurrent = !isDone && i === completedSteps;
              return (
                <div key={stepLabel} className="flex items-start gap-3">
                  <div className={`mt-0.5 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xl font-bold ${
                    isDone ? 'bg-green-500 text-white' : isCurrent ? 'bg-navy-700 text-white' : 'bg-gray-200 text-gray-400'
                  }`}>
                    {isDone ? '✓' : i + 1}
                  </div>
                  <div className="flex-1">
                    <p className={`text-3xl font-bold ${isDone ? 'text-green-700' : isCurrent ? 'text-navy-700' : 'text-gray-400'}`}>
                      {stepLabel}
                    </p>
                    {tl?.timestamp && <p className="text-xl text-navy-700">{formatThaiDateTime(tl.timestamp)}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-5xl font-bold text-navy-700">คำขอของฉัน</h2>
          <p className="text-3xl text-navy-700">{requests.length} รายการ</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/portal/request" className="btn-secondary">ยื่นคำขอ (แบบใหม่)</Link>
          <button onClick={() => { setView('new'); setStep(1); }} className="btn-primary">
            + ยื่นคำขอใหม่
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {requests.map(req => (
          <button
            key={req.id}
            onClick={() => { setSelectedReq(req); setView('detail'); }}
            className="card p-4 w-full text-left hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-2xl font-bold text-navy-700">{req.reqNo}</p>
                <p className="text-3xl text-gray-600">{req.cameraId} · {req.cameraLocation}</p>
              </div>
              <StatusBadge status={req.status} />
            </div>
            <div className="flex items-center gap-4 text-xl text-navy-700">
              <span className="flex items-center gap-1"><Clock size={18} /> ยื่น {formatThaiDate(req.submittedAt)}</span>
              <span>{req.purpose}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

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
              className="w-full pl-9 pr-3 py-2 text-2xl border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-navy-500"
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full text-2xl border border-gray-300 rounded-lg px-2 py-2 focus:outline-none">
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

  return (
    <Layout>
      <div className="h-full flex flex-col">
        {!isCitizen && (
          <div className="bg-white border-b border-gray-200 px-5 py-3">
            <h2 className="text-3xl font-bold text-navy-700 flex items-center gap-2"><CameraIcon size={26} /> ระบบคำขอดูกล้อง CCTV</h2>
            <p className="text-3xl text-navy-700">จัดการคำขอประชาชน</p>
          </div>
        )}
        <div className="flex-1 min-h-0 overflow-auto">
          {isCitizen ? <CitizenView /> : <StaffView />}
        </div>
      </div>
    </Layout>
  );
}
