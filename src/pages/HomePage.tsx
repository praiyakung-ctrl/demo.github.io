import { useState } from 'react';
import { Camera as CameraIcon, Expand, Search, Video, VideoOff, Wifi } from 'lucide-react';
import { SkipLink } from '../components/Layout';
import { Navbar } from '../components/Navbar';
import { CitizenFooter, CitizenHero, ServiceMenuChips, ServiceSidebar } from '../components/CitizenPortalUI';
import { LiveCameraModal } from '../components/LiveCameraModal';
import camerasData from '../data/cameras.json';
import type { Camera } from '../types';
import { cameraImage, districtOf } from '../utils/cameraDisplay';

const publicCameras = (camerasData as Camera[]).filter(c => c.isPublic);
const AREAS = [...new Set(publicCameras.map(c => districtOf(c.location)))].sort((a, b) => a.localeCompare(b, 'th'));

const PAGE_STEP = 9;

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

function PublicCameraCard({ cam, onView }: { cam: Camera; onView: () => void }) {
  const online = cam.status === 'Online';
  return (
    <button
      onClick={onView}
      className="card p-0 overflow-hidden text-left hover:shadow-lg hover:border-navy-300 transition-all"
    >
      <div className="relative aspect-video bg-gray-900">
        {online ? (
          <img src={cameraImage(cam)} alt={cam.location} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-1">
            <VideoOff size={32} />
            <span className="text-sm font-bold">ออฟไลน์</span>
          </div>
        )}
        {online && (
          <span className="absolute top-2 left-2 flex items-center gap-1 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
          </span>
        )}
        <span className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-lg">
          <Expand size={16} />
        </span>
      </div>
      <div className="p-3">
        <p className="font-bold text-navy-700 text-xl truncate">{cam.location}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-lg text-gray-500 truncate">ต.{districtOf(cam.location).replace(' / ', ' อ.')}</span>
          <span className={`flex items-center gap-1 text-sm font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
            online ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-green-500' : 'bg-gray-400'}`} /> {online ? 'ออนไลน์' : 'ออฟไลน์'}
          </span>
        </div>
      </div>
    </button>
  );
}

export function HomePage() {
  const [search, setSearch] = useState('');
  const [area, setArea] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [visible, setVisible] = useState(PAGE_STEP);
  const [viewingCam, setViewingCam] = useState<Camera | null>(null);

  const online = publicCameras.filter(c => c.status === 'Online').length;

  const filtered = publicCameras.filter(c =>
    (search === '' || c.id.toLowerCase().includes(search.toLowerCase()) || c.location.includes(search)) &&
    (area === 'all' || districtOf(c.location) === area) &&
    (statusFilter === 'all' || c.status === statusFilter)
  );

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col">
      <SkipLink />
      <Navbar />
      <CitizenHero title="กล้องจราจรสาธารณะ">
        <p className="text-xl text-blue-100 max-w-xl">
          ดูภาพกล้องวงจรปิดจราจรแบบเรียลไทม์ในพื้นที่จังหวัดชลบุรี เพื่อการเดินทางที่สะดวกและปลอดภัย เปิดให้บริการประชาชนทุกท่านโดยไม่ต้องเข้าสู่ระบบ
        </p>
      </CitizenHero>

      <div className="flex-1 w-full max-w-[1400px] mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-5 items-start">
        <div className="lg:hidden"><ServiceMenuChips active="home" /></div>
        <aside className="hidden lg:block">
          <ServiceSidebar active="home" />
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
                onChange={e => { setSearch(e.target.value); setVisible(PAGE_STEP); }}
                placeholder="ค้นหาชื่อสถานที่หรือรหัสกล้อง..."
                className="input-field pl-9"
              />
            </div>
            <div>
              <label htmlFor="home-area" className="label">พื้นที่</label>
              <select id="home-area" value={area} onChange={e => { setArea(e.target.value); setVisible(PAGE_STEP); }} className="input-field w-auto">
                <option value="all">ทั้งหมด</option>
                {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="home-status" className="label">สถานะ</label>
              <select id="home-status" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setVisible(PAGE_STEP); }} className="input-field w-auto">
                <option value="all">ทั้งหมด</option>
                <option value="Online">ออนไลน์</option>
                <option value="Offline">ออฟไลน์</option>
              </select>
            </div>
          </div>

          {/* camera grid */}
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">กล้องจราจร (พบ {filtered.length} ตัว)</h2>
            {filtered.length === 0 ? (
              <div className="card text-center py-10 text-gray-400">
                <VideoOff size={40} className="mx-auto mb-2 opacity-40" />
                <p className="text-xl">ไม่พบกล้องที่ค้นหา</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filtered.slice(0, visible).map(cam => (
                    <PublicCameraCard key={cam.id} cam={cam} onView={() => setViewingCam(cam)} />
                  ))}
                </div>
                {visible < filtered.length && (
                  <button onClick={() => setVisible(v => v + PAGE_STEP)} className="btn-secondary w-full mt-4">
                    ดูเพิ่มเติม
                  </button>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      <CitizenFooter />
      <LiveCameraModal camera={viewingCam} onClose={() => setViewingCam(null)} hideCaptureControls />
    </div>
  );
}
