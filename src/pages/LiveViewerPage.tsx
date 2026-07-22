import { useEffect, useMemo, useRef, useState } from 'react';
import { Grid2x2, Grid2x2Plus, Grid3x3, LayoutGrid, Maximize2, Pause, Play, Square, VideoOff, Wifi } from 'lucide-react';
import { Layout } from '../components/Layout';
import { cameraImage, districtOf } from '../utils/cameraDisplay';
import camerasData from '../data/cameras.json';
import type { Camera } from '../types';

const cameras = camerasData as Camera[];

type SortOrder = 'id' | 'area' | 'offlineFirst';
const LAYOUTS = [1, 4, 6, 9, 16] as const;
type LayoutCount = (typeof LAYOUTS)[number];
const INTERVALS = [10, 15, 30, 60];

const LAYOUT_ICONS: Record<LayoutCount, typeof Square> = {
  1: Square, 4: Grid2x2, 6: LayoutGrid, 9: Grid3x3, 16: Grid2x2Plus,
};

const GRID_COLS: Record<LayoutCount, string> = {
  1: 'grid-cols-1', 4: 'grid-cols-2', 6: 'grid-cols-3', 9: 'grid-cols-3', 16: 'grid-cols-4',
};

function sortCameras(list: Camera[], order: SortOrder): Camera[] {
  const sorted = [...list];
  if (order === 'area') sorted.sort((a, b) => districtOf(a.location).localeCompare(districtOf(b.location), 'th'));
  else if (order === 'offlineFirst') sorted.sort((a, b) => (a.status === 'Offline' ? 0 : 1) - (b.status === 'Offline' ? 0 : 1));
  return sorted; // 'id' — cameras.json is already ordered by camera number
}

export function LiveViewerPage() {
  const [layoutCount, setLayoutCount] = useState<LayoutCount>(9);
  const [sortOrder, setSortOrder] = useState<SortOrder>('id');
  const [page, setPage] = useState(0);
  const [rotating, setRotating] = useState(true);
  const [intervalSec, setIntervalSec] = useState(15);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const sortedCameras = useMemo(() => sortCameras(cameras, sortOrder), [sortOrder]);
  const totalPages = Math.max(1, Math.ceil(sortedCameras.length / layoutCount));

  useEffect(() => {
    if (!rotating) return;
    const timer = setInterval(() => setPage(p => (p + 1) % totalPages), intervalSec * 1000);
    return () => clearInterval(timer);
  }, [rotating, intervalSec, totalPages]);

  const pageCameras = sortedCameras.slice(page * layoutCount, page * layoutCount + layoutCount);
  const selected = cameras.find(c => c.id === selectedId) ?? pageCameras[0] ?? sortedCameras[0] ?? null;

  const onlineCount = cameras.filter(c => c.status === 'Online').length;
  const offlineCount = cameras.length - onlineCount;

  return (
    <Layout>
      <div className="flex flex-col h-full min-h-0">
        <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200">
          <div>
            <h1 className="text-3xl font-bold text-navy-700">Live Viewer</h1>
            <p className="text-lg text-gray-500">หมุนเวียนภาพกล้อง CCTV อัตโนมัติ — หน้า {page + 1}/{totalPages}</p>
          </div>
          <button
            onClick={() => setRotating(r => !r)}
            className={`flex items-center gap-2 text-lg font-bold px-4 py-2 rounded-lg border-2 transition-colors ${
              rotating ? 'bg-red-50 text-red-600 border-red-300 hover:bg-red-100' : 'bg-green-50 text-green-600 border-green-300 hover:bg-green-100'
            }`}
          >
            {rotating ? <><Pause size={18} /> หยุดหมุนเวียน</> : <><Play size={18} /> เริ่มหมุนเวียน</>}
          </button>
        </div>

        <div className="flex-1 flex min-h-0">
          <div ref={gridRef} className="flex-1 min-h-0 overflow-y-auto p-3 bg-gray-900">
            <div className={`grid gap-2 ${GRID_COLS[layoutCount]}`}>
              {pageCameras.map(cam => (
                <button
                  key={cam.id}
                  onClick={() => setSelectedId(cam.id)}
                  className={`relative bg-gray-800 rounded-xl overflow-hidden aspect-video border-2 transition-colors ${
                    selected?.id === cam.id ? 'border-navy-400' : 'border-transparent'
                  }`}
                >
                  {cam.status === 'Online' ? (
                    <img
                      src={cameraImage(cam)}
                      alt={cam.location}
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-gray-400">
                      <VideoOff size={28} />
                      <span className="text-sm">ออฟไลน์</span>
                    </div>
                  )}
                  <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
                    <span className="bg-gray-900/80 text-white text-xs font-bold px-2 py-0.5 rounded-md">{cam.id}</span>
                    {cam.status === 'Online' ? (
                      <span className="flex items-center gap-1 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-md">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
                      </span>
                    ) : (
                      <span className="w-2.5 h-2.5 bg-red-500 rounded-full" />
                    )}
                  </div>
                  <p className="absolute bottom-1.5 left-2 text-white text-xs font-medium truncate max-w-[85%] pointer-events-none drop-shadow">{cam.location}</p>
                </button>
              ))}
            </div>
          </div>

          <aside className="hidden lg:flex w-80 flex-shrink-0 flex-col gap-3 p-3 bg-white border-l border-gray-200 overflow-y-auto">
            <div className="card">
              <h3 className="text-xl font-bold text-navy-700 mb-2">ข้อมูลกล้องที่เลือก</h3>
              {selected ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-extrabold text-navy-700">{selected.id}</p>
                    <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${selected.status === 'Online' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {selected.status === 'Online' ? 'ออนไลน์' : 'ออฟไลน์'}
                    </span>
                  </div>
                  <p className="text-base text-gray-600">{selected.location}</p>
                  <div className="pt-2 space-y-1 text-base text-gray-700">
                    <p><span className="text-gray-400">ผู้ผลิต:</span> {selected.brand ?? '-'}</p>
                    <p><span className="text-gray-400">รุ่น:</span> {selected.model ?? '-'}</p>
                    <p><span className="text-gray-400">ความละเอียด:</span> {selected.resolution ?? '-'}</p>
                    <p><span className="text-gray-400">มุมกล้อง:</span> {selected.angle != null ? `${selected.angle}°` : '-'}</p>
                    <p className="flex items-center gap-1"><Wifi size={14} className="text-gray-400" /> สถานะสัญญาณ: {selected.signalQuality ?? '-'}</p>
                    <p><span className="text-gray-400">อัปเดตล่าสุด:</span> {selected.lastUpdate}</p>
                  </div>
                </div>
              ) : <p className="text-base text-gray-400">ยังไม่ได้เลือกกล้อง</p>}
            </div>

            <div className="card">
              <h3 className="text-xl font-bold text-navy-700 mb-2">สรุปสถานะกล้อง</h3>
              {[
                { label: 'ออนไลน์', count: onlineCount, color: 'bg-green-500' },
                { label: 'ออฟไลน์', count: offlineCount, color: 'bg-red-500' },
                { label: 'สัญญาณไม่เสถียร', count: 0, color: 'bg-amber-500' },
                { label: 'บำรุงรักษา', count: 0, color: 'bg-gray-400' },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between text-base py-1">
                  <span className="flex items-center gap-2 text-gray-700"><span className={`w-2.5 h-2.5 rounded-full ${row.color}`} />{row.label}</span>
                  <span className="font-bold text-gray-800">{row.count} ตัว ({((row.count / cameras.length) * 100).toFixed(1)}%)</span>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <div className="border-t border-gray-200 p-3 bg-white flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-base font-bold text-gray-700">
            <input type="checkbox" checked={rotating} onChange={e => setRotating(e.target.checked)} className="accent-[#1b3a6b]" />
            การหมุนเวียนอัตโนมัติ
          </label>
          <select value={intervalSec} onChange={e => setIntervalSec(Number(e.target.value))} className="input-field w-auto text-base py-1.5">
            {INTERVALS.map(s => <option key={s} value={s}>สลับทุก {s} วินาที</option>)}
          </select>

          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold text-gray-700 mr-1">ลำดับการแสดงผล:</span>
            {([
              { value: 'id' as SortOrder, label: 'เรียงตามหมายเลขกล้อง' },
              { value: 'area' as SortOrder, label: 'เรียงตามพื้นที่' },
              { value: 'offlineFirst' as SortOrder, label: 'กล้องที่ออฟไลน์ก่อน' },
            ]).map(opt => (
              <button
                key={opt.value}
                onClick={() => { setSortOrder(opt.value); setPage(0); }}
                className={`text-sm font-bold px-2.5 py-1.5 rounded-lg border transition-colors ${
                  sortOrder === opt.value ? 'bg-navy-500 text-white border-navy-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            {LAYOUTS.map(count => {
              const Icon = LAYOUT_ICONS[count];
              return (
                <button
                  key={count}
                  onClick={() => { setLayoutCount(count); setPage(0); }}
                  className={`flex items-center gap-1.5 text-sm font-bold px-2.5 py-2 rounded-lg border transition-colors ${
                    layoutCount === count ? 'bg-navy-500 text-white border-navy-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={15} /> {count} จอ
                </button>
              );
            })}
            <button
              onClick={() => gridRef.current?.requestFullscreen?.()}
              title="ทำเต็มจอ"
              aria-label="ทำเต็มจอ"
              className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Maximize2 size={15} />
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
