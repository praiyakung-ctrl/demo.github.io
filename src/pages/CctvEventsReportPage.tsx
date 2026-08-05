import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Search } from 'lucide-react';
import { Layout } from '../components/Layout';
import { Pagination } from '../components/Pagination';
import { ExportButtons } from '../components/ExportButtons';
import camerasData from '../data/cameras.json';
import eventsData from '../data/events.json';
import type { Camera, CctvEvent, EventType } from '../types';
import { EVENT_COLORS, EVENT_LABELS } from '../types';
import { formatThaiDate, formatTime } from '../utils/formatDate';
import { districtOf, stationOf, STATION_FILTER_OPTIONS } from '../utils/cameraDisplay';
import { exportElementToPdf, exportRowsToExcel, todayStamp } from '../utils/exportReport';
import { EVENT_CATEGORY_KEYS } from '../utils/eventDrilldown';

const PAGE_SIZE = 10;

const cameras = camerasData as Camera[];
const events = eventsData as CctvEvent[];
const camerasById = new Map(cameras.map(c => [c.id, c]));

interface EventRow {
  id: string;
  cameraId: string;
  cameraName: string;
  installPosition: string;
  installSite: string;
  station: string;
  eventType: EventType;
  timestamp: string;
  isAcknowledged: boolean;
}

const allRows: EventRow[] = events.map(ev => {
  const cam = camerasById.get(ev.cameraId);
  return {
    id: ev.id,
    cameraId: ev.cameraId,
    cameraName: cam?.name ?? ev.cameraId,
    installPosition: cam?.location ?? ev.cameraName,
    installSite: cam ? districtOf(cam.location) : '-',
    station: cam ? stationOf(cam.location) : 'อื่นๆ/ไม่ระบุ สภ.',
    eventType: ev.eventType,
    timestamp: ev.timestamp,
    isAcknowledged: ev.isAcknowledged,
  };
}).sort((a, b) => b.timestamp.localeCompare(a.timestamp));

const MONTH_OPTIONS = [...new Set(allRows.map(r => r.timestamp.slice(0, 7)))].sort();

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
}

export function CctvEventsReportPage() {
  const [searchParams] = useSearchParams();
  const initialDay = searchParams.get('day') ?? '';
  const initialType = (() => {
    const fromQuery = searchParams.get('eventType');
    return fromQuery && (EVENT_CATEGORY_KEYS as readonly string[]).includes(fromQuery) ? fromQuery as EventType : 'all';
  })();

  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');
  const [dayFilter, setDayFilter] = useState(initialDay);
  const [stationFilter, setStationFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<EventType | 'all'>(initialType);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const filtered = allRows.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.cameraId.toLowerCase().includes(q) || r.installPosition.toLowerCase().includes(q);
    const matchStation = stationFilter === 'all' || r.station === stationFilter;
    const matchType = typeFilter === 'all' || r.eventType === typeFilter;
    const day = r.timestamp.slice(0, 10);
    const matchDay = !dayFilter || day === dayFilter;
    const matchMonth = monthFilter === 'all' || day.slice(0, 7) === monthFilter;
    return matchSearch && matchStation && matchType && matchDay && matchMonth;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const exportRows: (string | number)[][] = [
    ['ตำแหน่งที่ติดตั้ง', 'สถานที่ติดตั้ง', 'รหัสกล้อง', 'ชื่อกล้อง', 'ชื่อเหตุการณ์', 'วันที่', 'เวลา', 'สถานะ'],
    ...filtered.map(r => [
      r.installPosition, r.installSite, r.cameraId, r.cameraName, EVENT_LABELS[r.eventType],
      formatThaiDate(r.timestamp), formatTime(r.timestamp), r.isAcknowledged ? 'รับทราบแล้ว' : 'ยังไม่รับทราบ',
    ]),
  ];

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (exporting) return;
    setExporting(true);
    try {
      const filename = `รายงานเหตุการณ์-CCTV-${todayStamp()}`;
      if (format === 'excel') {
        await exportRowsToExcel(exportRows, 'เหตุการณ์ CCTV', `${filename}.xlsx`);
      } else if (tableRef.current) {
        await exportElementToPdf(tableRef.current, `${filename}.pdf`);
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col h-full">
        {/* Page header banner */}
        <div className="bg-blue-50 border-b-2 border-blue-100 px-6 py-4 flex items-center justify-between shadow-sm flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-navy-700 rounded-xl flex items-center justify-center">
              <AlertTriangle size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-navy-700">รายงานเหตุการณ์ CCTV</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm text-gray-600">รายการเหตุการณ์ที่ตรวจพบจากกล้อง CCTV ทั้งหมด</span>
                <span className="bg-navy-700 text-white text-sm font-bold px-2.5 py-0.5 rounded-full">{allRows.length} รายการ</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5">
          <div ref={tableRef} className="card overflow-hidden shadow-md">

            {/* Search + filters */}
            <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 border-b border-gray-200">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="ค้นหารหัสกล้องหรือตำแหน่งที่ติดตั้ง..."
                  aria-label="ค้นหารหัสกล้องหรือตำแหน่งที่ติดตั้ง"
                  className="w-full pl-9 pr-3 py-2 text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:border-navy-400 bg-white"
                />
              </div>
              <select
                aria-label="กรองตามเดือน"
                value={monthFilter}
                onChange={e => { setMonthFilter(e.target.value); setPage(1); }}
                className="input-field w-auto py-2 text-base"
              >
                <option value="all">ทุกเดือน</option>
                {MONTH_OPTIONS.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
              </select>
              <input
                type="date"
                aria-label="กรองตามวัน"
                value={dayFilter}
                onChange={e => { setDayFilter(e.target.value); setPage(1); }}
                className="input-field w-auto py-2 text-base"
              />
              <select
                aria-label="กรองตามสภ."
                value={stationFilter}
                onChange={e => { setStationFilter(e.target.value); setPage(1); }}
                className="input-field w-auto py-2 text-base"
              >
                <option value="all">ทุก สภ.</option>
                {STATION_FILTER_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                aria-label="กรองตามประเภทเหตุการณ์"
                value={typeFilter}
                onChange={e => { setTypeFilter(e.target.value as EventType | 'all'); setPage(1); }}
                className="input-field w-auto py-2 text-base"
              >
                <option value="all">ทุกประเภทเหตุการณ์</option>
                {EVENT_CATEGORY_KEYS.map(k => <option key={k} value={k}>{EVENT_LABELS[k]}</option>)}
              </select>
              <span className="text-base text-navy-700 font-bold flex-shrink-0">
                พบ {filtered.length} / {allRows.length} รายการ
              </span>
              <div className="ml-auto flex-shrink-0">
                <ExportButtons disabled={exporting} onPdf={() => handleExport('pdf')} onExcel={() => handleExport('excel')} />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xl">
                <thead>
                  <tr className="bg-blue-200">
                    {['ตำแหน่งที่ติดตั้ง', 'สถานที่ติดตั้ง', 'รหัสกล้อง', 'ชื่อกล้อง', 'ชื่อเหตุการณ์', 'วันที่', 'เวลา', 'สถานะ'].map(h => (
                      <th key={h} scope="col" className="text-left text-xl font-bold text-navy-700 px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r, idx) => (
                    <tr key={r.id} className={`border-b border-blue-100 hover:bg-blue-100 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-blue-50'}`}>
                      <td className="px-4 py-2.5 text-gray-700">{r.installPosition}</td>
                      <td className="px-4 py-2.5 text-gray-700">{r.installSite}</td>
                      <td className="px-4 py-2.5 text-gray-700">{r.cameraId}</td>
                      <td className="px-4 py-2.5 text-gray-700">{r.cameraName}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className="inline-flex items-center text-sm font-bold px-3 py-1 rounded-lg text-white"
                          style={{ backgroundColor: EVENT_COLORS[r.eventType] }}
                        >
                          {EVENT_LABELS[r.eventType]}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{formatThaiDate(r.timestamp)}</td>
                      <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{formatTime(r.timestamp)}</td>
                      <td className="px-4 py-2.5">
                        {r.isAcknowledged ? (
                          <span className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-lg bg-green-100 text-green-700">
                            <CheckCircle size={14} /> รับทราบแล้ว
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-lg bg-red-100 text-red-700">
                            <AlertTriangle size={14} /> ยังไม่รับทราบ
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {pageRows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-gray-400 text-lg">ไม่พบรายการที่ตรงกับเงื่อนไข</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination total={filtered.length} page={safePage} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </div>
        </div>
      </div>
    </Layout>
  );
}
