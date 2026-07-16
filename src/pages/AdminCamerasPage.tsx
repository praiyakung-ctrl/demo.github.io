import { useState } from 'react';
import { Plus, Pencil, Trash2, Search, Camera as CameraIcon, MapPin, Settings, Wifi, Save, XCircle, Building2, Compass, Video } from 'lucide-react';
import { EVENT_COLORS, EVENT_LABELS } from '../types';
import { Layout } from '../components/Layout';
import { StatusBadge } from '../components/Badge';
import { Modal, ConfirmDialog } from '../components/Modal';
import camerasData from '../data/cameras.json';
import type { Camera } from '../types';
import { useAuth } from '../context/AuthContext';

const INITIAL = camerasData as Camera[];

const EMPTY: Omit<Camera, 'id'> = {
  name: '', location: '', lat: 13.36, lng: 100.98,
  type: 'Fixed', organization: '', rtspUrl: '', status: 'Online',
  direction: '', lastUpdate: new Date().toISOString(), currentEvent: 'normal',
  lprMbps: 6, unityMbps: 6,
};

export function AdminCamerasPage() {
  const { can } = useAuth();
  const [cameras, setCameras] = useState<Camera[]>(INITIAL);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editCam, setEditCam] = useState<Camera | null>(null);
  const [form, setForm] = useState<Omit<Camera, 'id'>>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = cameras.filter(c =>
    c.id.toLowerCase().includes(search.toLowerCase()) ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.location.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditCam(null);
    setForm(EMPTY);
    setModalOpen(true);
  };

  const openEdit = (cam: Camera) => {
    setEditCam(cam);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructuring to drop id
    const { id, ...rest } = cam;
    setForm(rest);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (editCam) {
      setCameras(prev => prev.map(c => c.id === editCam.id ? { ...form, id: editCam.id } : c));
    } else {
      const newId = `CAM-${String(cameras.length + 1).padStart(3, '0')}`;
      setCameras(prev => [...prev, { ...form, id: newId }]);
    }
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (deleteId) setCameras(prev => prev.filter(c => c.id !== deleteId));
    setDeleteId(null);
  };

  const set = (key: keyof typeof form, val: string | number) => setForm(f => ({ ...f, [key]: val }));

  return (
    <Layout>
      <div className="flex flex-col h-full">

        {/* Page header banner */}
        <div className="bg-navy-700 px-6 py-4 flex items-center justify-between shadow-md flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Video size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">จัดการกล้อง CCTV</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm text-navy-200">กล้องในระบบทั้งหมด</span>
                <span className="bg-white/25 text-white text-sm font-bold px-2.5 py-0.5 rounded-full">{cameras.length} กล้อง</span>
              </div>
            </div>
          </div>
          {can('adminCameras', 'create') && (
            <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl border-2 border-green-400 shadow-lg hover:shadow-xl hover:scale-105 transition-all text-base">
              <Plus size={20} /> เพิ่มกล้อง
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5">
          <div className="card overflow-hidden shadow-md">

            {/* Search bar */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 border-b border-gray-200">
              <div className="relative flex-1 max-w-sm">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="ค้นหา Camera ID, ชื่อ, หรือสถานที่..."
                  aria-label="ค้นหา Camera ID ชื่อ หรือสถานที่"
                  className="w-full pl-9 pr-3 py-2 text-xl border-2 border-gray-200 rounded-xl focus:outline-none focus:border-navy-400 bg-white"
                />
              </div>
              <span className="text-xl text-navy-700 font-bold flex-shrink-0">
                พบ {filtered.length} / {cameras.length} รายการ
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xl">
                <thead>
                  <tr className="bg-navy-700">
                    {['Camera ID', 'ชื่อ / สถานที่', 'ประเภท', 'หน่วยงาน', 'ทิศทาง', 'โครงข่าย NT MPLS', 'สถานะ', 'เหตุการณ์', 'ดำเนินการ'].map(h => (
                      <th key={h} scope="col" className="text-left text-xl font-bold text-white px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((cam, idx) => (
                    <tr key={cam.id} className={`border-b border-gray-100 hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}`}>
                      {/* Camera ID */}
                      <td className="px-4 py-3">
                        <div className="inline-flex items-center gap-1.5 text-navy-700 font-mono font-bold text-sm">
                          <CameraIcon size={13} className="text-navy-500 flex-shrink-0" /> {cam.id}
                        </div>
                      </td>
                      {/* Name / Location */}
                      <td className="px-4 py-3">
                        <p className="font-bold text-navy-700 text-xl">{cam.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin size={16} className="text-blue-500 flex-shrink-0" />
                          <p className="text-lg text-gray-900 truncate max-w-[240px]">{cam.location}</p>
                        </div>
                      </td>
                      {/* Type */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center text-sm font-bold px-2.5 py-1.5 rounded-lg border ${
                          cam.type === 'PTZ'
                            ? 'bg-purple-100 text-purple-700 border-purple-300'
                            : 'bg-blue-100 text-blue-700 border-blue-300'
                        }`}>
                          {cam.type}
                        </span>
                      </td>
                      {/* Organization */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Building2 size={19} className="text-gray-400 flex-shrink-0" />
                          <span className="text-gray-700 text-lg truncate max-w-[180px]">{cam.organization}</span>
                        </div>
                      </td>
                      {/* Direction */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Compass size={19} className="text-gray-400 flex-shrink-0" />
                          <span className="text-gray-700 text-lg">{cam.direction || '—'}</span>
                        </div>
                      </td>
                      {/* NT MPLS link */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Wifi size={19} className="text-navy-400 flex-shrink-0" />
                          <div>
                            <p className="text-lg font-bold text-navy-700 whitespace-nowrap">รวม {cam.lprMbps + cam.unityMbps} Mbps</p>
                            <p className="text-sm text-gray-500 whitespace-nowrap">LPR {cam.lprMbps} · Unity 8 {cam.unityMbps}</p>
                          </div>
                        </div>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3"><StatusBadge status={cam.status} /></td>
                      {/* Event */}
                      <td className="px-4 py-3">
                        {cam.currentEvent && cam.currentEvent !== 'normal'
                          ? <span className="inline-flex items-center text-lg font-bold px-3 py-1 rounded-full text-white" style={{ backgroundColor: EVENT_COLORS[cam.currentEvent] }}>
                              {EVENT_LABELS[cam.currentEvent]}
                            </span>
                          : <span className="inline-flex items-center text-lg text-green-600 font-medium bg-green-50 px-3 py-1 rounded-full border border-green-200">ปกติ</span>
                        }
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {can('adminCameras', 'edit') && (
                            <button onClick={() => openEdit(cam)} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-lg shadow-sm hover:shadow transition-all">
                              <Pencil size={13} /> แก้ไข
                            </button>
                          )}
                          {can('adminCameras', 'delete') && (
                            <button onClick={() => setDeleteId(cam.id)} className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-lg shadow-sm hover:shadow transition-all">
                              <Trash2 size={13} /> ลบ
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editCam ? `แก้ไข ${editCam.id}` : 'เพิ่มกล้องใหม่'} size="lg">
        <div className="space-y-4">

          {/* Section 1: ข้อมูลกล้อง */}
          <div className="rounded-xl border-2 border-blue-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border-b border-blue-200">
              <CameraIcon size={16} className="text-blue-600" />
              <span className="text-sm font-bold text-blue-700">ข้อมูลกล้อง</span>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4">
              <div>
                <label htmlFor="cam-name" className="text-sm font-bold text-navy-700 mb-1 block">ชื่อกล้อง <span className="text-red-500">*</span></label>
                <input id="cam-name" value={form.name} onChange={e => set('name', e.target.value)} className="input-field" placeholder="เช่น กล้อง CCTV หน้าตลาด" />
              </div>
              <div>
                <label htmlFor="cam-location" className="text-sm font-bold text-navy-700 mb-1 block">สถานที่ <span className="text-red-500">*</span></label>
                <input id="cam-location" value={form.location} onChange={e => set('location', e.target.value)} className="input-field" placeholder="เช่น ถนนสุขุมวิท" />
              </div>
            </div>
          </div>

          {/* Section 2: พิกัด */}
          <div className="rounded-xl border-2 border-green-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border-b border-green-200">
              <MapPin size={16} className="text-green-600" />
              <span className="text-sm font-bold text-green-700">พิกัดตำแหน่ง</span>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4">
              <div>
                <label htmlFor="cam-lat" className="text-sm font-bold text-navy-700 mb-1 block">Latitude</label>
                <input id="cam-lat" type="number" step="0.0001" value={form.lat} onChange={e => set('lat', parseFloat(e.target.value))} className="input-field font-mono" />
              </div>
              <div>
                <label htmlFor="cam-lng" className="text-sm font-bold text-navy-700 mb-1 block">Longitude</label>
                <input id="cam-lng" type="number" step="0.0001" value={form.lng} onChange={e => set('lng', parseFloat(e.target.value))} className="input-field font-mono" />
              </div>
            </div>
          </div>

          {/* Section 3: การตั้งค่า */}
          <div className="rounded-xl border-2 border-purple-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 border-b border-purple-200">
              <Settings size={16} className="text-purple-600" />
              <span className="text-sm font-bold text-purple-700">การตั้งค่า</span>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4">
              <div>
                <label htmlFor="cam-type" className="text-sm font-bold text-navy-700 mb-1 block">ประเภทกล้อง</label>
                <select id="cam-type" value={form.type} onChange={e => set('type', e.target.value)} className="input-field">
                  <option>Fixed</option>
                  <option>PTZ</option>
                </select>
              </div>
              <div>
                <label htmlFor="cam-org" className="text-sm font-bold text-navy-700 mb-1 block">หน่วยงาน</label>
                <div className="relative">
                  <Building2 size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input id="cam-org" value={form.organization} onChange={e => set('organization', e.target.value)} className="input-field pl-8" placeholder="เช่น อบจ.ชลบุรี" />
                </div>
              </div>
              <div>
                <label htmlFor="cam-direction" className="text-sm font-bold text-navy-700 mb-1 block">ทิศทาง</label>
                <input id="cam-direction" value={form.direction} onChange={e => set('direction', e.target.value)} className="input-field" placeholder="เช่น เหนือ-ใต้" />
              </div>
              <div>
                <label htmlFor="cam-status" className="text-sm font-bold text-navy-700 mb-1 block">สถานะ</label>
                <select id="cam-status" value={form.status} onChange={e => set('status', e.target.value)} className="input-field">
                  <option>Online</option>
                  <option>Offline</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: การเชื่อมต่อ */}
          <div className="rounded-xl border-2 border-orange-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 border-b border-orange-200">
              <Wifi size={16} className="text-orange-600" />
              <span className="text-sm font-bold text-orange-700">การเชื่อมต่อ</span>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label htmlFor="cam-rtsp" className="text-sm font-bold text-navy-700 mb-1 block">RTSP URL (Mock)</label>
                <input id="cam-rtsp" value={form.rtspUrl} onChange={e => set('rtspUrl', e.target.value)} placeholder="rtsp://mock-server/cam-xxx" className="input-field font-mono text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="cam-lpr-mbps" className="text-sm font-bold text-navy-700 mb-1 block">LPR (Mbps)</label>
                  <input id="cam-lpr-mbps" type="number" min={0} value={form.lprMbps} onChange={e => set('lprMbps', Number(e.target.value))} className="input-field" />
                </div>
                <div>
                  <label htmlFor="cam-unity-mbps" className="text-sm font-bold text-navy-700 mb-1 block">Unity 8 (Mbps)</label>
                  <input id="cam-unity-mbps" type="number" min={0} value={form.unityMbps} onChange={e => set('unityMbps', Number(e.target.value))} className="input-field" />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Buttons */}
        <div className="flex gap-3 justify-end mt-5 pt-4 border-t border-gray-100">
          <button onClick={() => setModalOpen(false)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-all">
            <XCircle size={18} /> ยกเลิก
          </button>
          <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-navy-700 text-white font-bold border-2 border-navy-800 shadow hover:bg-navy-800 hover:shadow-lg hover:scale-105 transition-all">
            <Save size={18} /> บันทึก
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="ยืนยันการลบ"
        message={`ต้องการลบกล้อง ${deleteId} ออกจากระบบ?`}
        confirmLabel="ลบ"
        danger
      />
    </Layout>
  );
}
