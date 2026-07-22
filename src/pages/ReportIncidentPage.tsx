import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import {
  AlertTriangle, Camera as CameraIcon, FileSpreadsheet, MapPin, Plus, ShieldAlert, Upload, X,
} from 'lucide-react';
import { SkipLink } from '../components/Layout';
import { Navbar } from '../components/Navbar';
import { CitizenFooter, CitizenHero, ServiceMenuChips, ServiceSidebar } from '../components/CitizenPortalUI';
import { CameraClusterMarkers } from '../components/CameraClusterMarkers';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import camerasData from '../data/cameras.json';
import type { Camera, IncidentPoint, IncidentPointStatus, IncidentPointType } from '../types';
import { INCIDENT_CATEGORY_OPTIONS, INCIDENT_FREQUENCY_OPTIONS } from '../types';
import { formatThaiDate, formatThaiDateTime } from '../utils/formatDate';
import { addIncidentPoint, savedIncidentPoints } from '../utils/incidentPoints';
import { logAudit } from '../utils/auditLog';
import { exportRowsToExcel, todayStamp } from '../utils/exportReport';
import { clusterByProximity } from '../utils/geo';
import { clusterCountIcon, pinIcon } from '../utils/mapPin';
import { Link } from 'react-router-dom';

function StatCard({ icon: Icon, label, value, color }: { icon: typeof ShieldAlert; label: string; value: number; color: string }) {
  return (
    <div className="card flex items-center gap-3 py-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}22`, color }}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-lg text-gray-500 leading-tight">{label}</p>
        <p className="text-3xl font-extrabold leading-tight" style={{ color }}>{value} จุด</p>
      </div>
    </div>
  );
}

const allCameras = camerasData as Camera[];

const STATUS_LABEL: Record<IncidentPointStatus, string> = {
  pending: 'รอตรวจสอบ',
  approved: 'อนุมัติ',
  rejected: 'ปฏิเสธ',
};

const TYPE_LABEL: Record<IncidentPointType, string> = {
  risk: 'จุดเสี่ยงภัย',
  proposed: 'จุดขอติดตั้งใหม่',
};

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

  const myType: IncidentPointType | null = isPolice ? 'risk' : isLocalOfficer ? 'proposed' : null;
  const refresh = () => setPoints(savedIncidentPoints());

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
          formatThaiDateTime(p.submittedAt), STATUS_LABEL[p.status],
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
      <CitizenHero title="แจ้งเหตุ (จุดเสี่ยงภัย/จุดขอติดตั้ง)">
        <p className="text-xl text-blue-100 max-w-xl">
          ตำรวจปักหมุดจุดเสี่ยงภัย และเจ้าหน้าที่ท้องถิ่นปักหมุดขอติดตั้งกล้อง CCTV ใหม่ เพื่อให้เจ้าหน้าที่ อบจ. พิจารณาดำเนินการ
        </p>
      </CitizenHero>

      <div className="flex-1 w-full max-w-[1400px] mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_320px] gap-5 items-start">
        <div className="lg:hidden"><ServiceMenuChips /></div>
        <aside className="hidden lg:block">
          <ServiceSidebar />
        </aside>

        <main id="main-content" tabIndex={-1} className="min-w-0 focus:outline-none space-y-5">
          {(isAdmin || isOperator) && (
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 flex items-center justify-between gap-3">
              <p className="text-lg text-navy-700">มุมมองนี้แสดงเพื่อดูตัวอย่างเท่านั้น เจ้าหน้าที่ อบจ. ตรวจสอบและอนุมัติได้ที่หน้าตรวจสอบจุดแจ้งเหตุ</p>
              <Link to="/admin/incidents" className="btn-primary whitespace-nowrap">ไปหน้าตรวจสอบ</Link>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <StatCard icon={AlertTriangle} label="จุดเสี่ยงภัยทั้งหมด" value={riskCount} color="#DC2626" />
            <StatCard icon={ShieldAlert} label="จุดขอติดตั้งใหม่ทั้งหมด" value={proposedCount} color="#CA8A04" />
          </div>

          {myType && (
            <div>
              {!addMode ? (
                <button
                  onClick={() => setAddMode(true)}
                  className={`btn-primary flex items-center gap-2 ${myType === 'risk' ? 'bg-red-600 border-red-700 hover:bg-red-700' : 'bg-yellow-500 border-yellow-600 hover:bg-yellow-600'}`}
                >
                  <Plus size={20} /> {myType === 'risk' ? 'ปักหมุดจุดเสี่ยงภัย' : 'ปักหมุดจุดขอติดตั้งใหม่'}
                </button>
              ) : (
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                  <MapPin size={22} className="text-navy-700 flex-shrink-0" />
                  <p className="text-lg text-navy-700 flex-1">คลิกบนแผนที่เพื่อปักหมุดตำแหน่ง</p>
                  <button onClick={() => setAddMode(false)} className="text-gray-500 hover:text-red-500"><X size={20} /></button>
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl overflow-hidden border border-gray-200 h-[420px] relative z-0">
            <MapContainer center={[13.36, 100.98]} zoom={11} className="w-full h-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <AddPinCapture active={addMode} onPick={handlePick} />

              {showCameras && (
                <CameraClusterMarkers cameras={allCameras} renderMarker={cam => (
                  <Marker key={cam.id} position={[cam.lat, cam.lng]} icon={pinIcon('#22C55E')}>
                    <Popup minWidth={200}>
                      <div style={{ fontFamily: "'TH Sarabun New', sans-serif" }}>
                        <p className="font-extrabold text-navy-700 text-xl leading-tight">{cam.id}</p>
                        <p className="text-lg text-gray-800">{cam.location}</p>
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
                              <p className="text-base text-gray-500">แจ้งโดย {p.submittedBy} · {formatThaiDate(p.submittedAt)} · {STATUS_LABEL[p.status]}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ) : (
                  <Marker key={group.items[0].id} position={[group.lat, group.lng]} icon={pinIcon('#EF4444')}>
                    <Popup minWidth={220}>
                      <div style={{ fontFamily: "'TH Sarabun New', sans-serif" }}>
                        <p className="font-extrabold text-red-700 text-xl leading-tight">จุดเสี่ยงภัย</p>
                        <p className="text-lg font-bold text-gray-800">{group.items[0].locationLabel}</p>
                        <p className="text-base text-gray-600">{group.items[0].category} · {group.items[0].frequency}</p>
                        <p className="text-base text-gray-500 mt-1">แจ้งโดย {group.items[0].submittedBy} · {formatThaiDate(group.items[0].submittedAt)} · {STATUS_LABEL[group.items[0].status]}</p>
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
                              <p className="text-base text-gray-500">แจ้งโดย {p.submittedBy} · {formatThaiDate(p.submittedAt)} · {STATUS_LABEL[p.status]}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ) : (
                  <Marker key={group.items[0].id} position={[group.lat, group.lng]} icon={pinIcon('#EAB308')}>
                    <Popup minWidth={220}>
                      <div style={{ fontFamily: "'TH Sarabun New', sans-serif" }}>
                        <p className="font-extrabold text-yellow-700 text-xl leading-tight">จุดขอติดตั้งใหม่</p>
                        <p className="text-lg font-bold text-gray-800">{group.items[0].locationLabel}</p>
                        <p className="text-base text-gray-600">{group.items[0].category} · {group.items[0].frequency}</p>
                        <p className="text-base text-gray-500 mt-1">แจ้งโดย {group.items[0].submittedBy} · {formatThaiDate(group.items[0].submittedAt)} · {STATUS_LABEL[group.items[0].status]}</p>
                      </div>
                    </Popup>
                  </Marker>
                )
              ))}
            </MapContainer>
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
                        {STATUS_LABEL[p.status]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>

        <aside className="space-y-4">
          <div className="card">
            <h3 className="text-2xl font-bold text-navy-700 mb-3">ตัวกรองข้อมูล</h3>
            <p className="label mb-2">ประเภทจุด</p>
            <div className="space-y-2 mb-4">
              <label className="flex items-center gap-2 text-lg text-gray-700 cursor-pointer">
                <input type="checkbox" checked={showCameras} onChange={e => setShowCameras(e.target.checked)} className="w-4 h-4 accent-[#1b3a6b]" />
                <CameraIcon size={16} className="text-green-600" /> กล้อง CCTV (ติดตั้งแล้ว)
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
        </aside>
      </div>

      <CitizenFooter />

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
