import { useRef, useState } from 'react';
import { ScanLine, Search } from 'lucide-react';
import { Layout } from '../components/Layout';
import { Pagination } from '../components/Pagination';
import { ExportButtons } from '../components/ExportButtons';
import lprData from '../data/lpr.json';
import type { LprEntry } from '../types';
import { parseLprTimestamp } from '../utils/formatDate';
import { districtOf, stationOf, STATION_FILTER_OPTIONS } from '../utils/cameraDisplay';
import { exportElementToPdf, exportRowsToExcel, todayStamp } from '../utils/exportReport';

const PAGE_SIZE = 10;

const entries = lprData.entries as LprEntry[];

const TYPE_OPTIONS = [...new Set(entries.map(e => e.type))].sort((a, b) => a.localeCompare(b, 'th'));
const ROAD_OPTIONS = [...new Set(entries.map(e => e.road))].sort((a, b) => a.localeCompare(b, 'th'));

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toTimeInput(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* no real per-plate/per-vehicle photo assets exist in this demo — cycle the
   8 generic camera stills already used elsewhere (cameraDisplay.ts's cameraImage()) */
function carPhotoSrc(seed: number): string {
  const n = (Math.abs(seed) % 8) + 1;
  return `${import.meta.env.BASE_URL}camera${String(n).padStart(3, '0')}.webp`;
}

export function LprSearchPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [roadFilter, setRoadFilter] = useState('all');
  const [stationFilter, setStationFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const q = search.trim();

  const filtered = entries.filter(e => {
    const matchSearch = !q || e.plate.includes(q);
    const matchType = typeFilter === 'all' || e.type === typeFilter;
    const matchRoad = roadFilter === 'all' || e.road === roadFilter;
    const matchStation = stationFilter === 'all' || stationOf(e.road) === stationFilter;
    const dt = parseLprTimestamp(e.timestamp);
    const dateStr = toDateInput(dt);
    const timeStr = toTimeInput(dt);
    const matchDateFrom = !dateFrom || dateStr >= dateFrom;
    const matchDateTo = !dateTo || dateStr <= dateTo;
    const matchTimeFrom = !timeFrom || timeStr >= timeFrom;
    const matchTimeTo = !timeTo || timeStr <= timeTo;
    return matchSearch && matchType && matchRoad && matchStation && matchDateFrom && matchDateTo && matchTimeFrom && matchTimeTo;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageOffset = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageOffset, pageOffset + PAGE_SIZE);

  const exportRows: (string | number)[][] = [
    ['ลำดับ', 'เวลา', 'ป้ายทะเบียน', 'ประเภท', 'กล้อง LPR', 'สถานที่'],
    ...filtered.map((r, idx) => [idx + 1, r.timestamp, r.plate, r.type, r.cameraId, r.road]),
  ];

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (exporting) return;
    setExporting(true);
    try {
      const filename = `รายงานค้นหาป้ายทะเบียน-LPR-${todayStamp()}`;
      if (format === 'excel') {
        await exportRowsToExcel(exportRows, 'ค้นหาป้ายทะเบียน LPR', `${filename}.xlsx`);
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
              <ScanLine size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-navy-700">
                {q ? `ผลการค้นหา : ${q}` : 'ค้นหาป้ายทะเบียน LPR'}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm text-gray-600">รายการป้ายทะเบียนที่ระบบ LPR อ่านได้ทั้งหมด</span>
                <span className="bg-navy-700 text-white text-sm font-bold px-2.5 py-0.5 rounded-full">{filtered.length} รายการ</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5">
          <div ref={tableRef} className="card overflow-hidden shadow-md">

            {/* Search + filters */}
            <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 border-b border-gray-200">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="ค้นหาป้ายทะเบียน..."
                  aria-label="ค้นหาป้ายทะเบียน"
                  className="w-full pl-9 pr-3 py-2 text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:border-navy-400 bg-white"
                />
              </div>
              <select
                aria-label="กรองตามประเภทรถ"
                value={typeFilter}
                onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
                className="input-field w-auto py-2 text-base"
              >
                <option value="all">ทุกประเภทรถ</option>
                {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select
                aria-label="กรองตามถนน"
                value={roadFilter}
                onChange={e => { setRoadFilter(e.target.value); setPage(1); }}
                className="input-field w-auto py-2 text-base max-w-[220px]"
              >
                <option value="all">ทุกถนน</option>
                {ROAD_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <select
                aria-label="กรองตามสภ."
                value={stationFilter}
                onChange={e => { setStationFilter(e.target.value); setPage(1); }}
                className="input-field w-auto py-2 text-base"
              >
                <option value="all">ทุก สภ.</option>
                {STATION_FILTER_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="flex items-center gap-1.5">
                <label htmlFor="lpr-date-from" className="text-sm text-gray-600 flex-shrink-0">วันที่</label>
                <input
                  id="lpr-date-from"
                  type="date"
                  aria-label="วันที่เริ่มต้น"
                  value={dateFrom}
                  onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                  className="input-field w-auto py-2 text-base"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="date"
                  aria-label="วันที่สิ้นสุด"
                  value={dateTo}
                  onChange={e => { setDateTo(e.target.value); setPage(1); }}
                  className="input-field w-auto py-2 text-base"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <label htmlFor="lpr-time-from" className="text-sm text-gray-600 flex-shrink-0">เวลา</label>
                <input
                  id="lpr-time-from"
                  type="time"
                  aria-label="เวลาเริ่มต้น"
                  value={timeFrom}
                  onChange={e => { setTimeFrom(e.target.value); setPage(1); }}
                  className="input-field w-auto py-2 text-base"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="time"
                  aria-label="เวลาสิ้นสุด"
                  value={timeTo}
                  onChange={e => { setTimeTo(e.target.value); setPage(1); }}
                  className="input-field w-auto py-2 text-base"
                />
              </div>
              <div className="ml-auto flex-shrink-0">
                <ExportButtons disabled={exporting} onPdf={() => handleExport('pdf')} onExcel={() => handleExport('excel')} />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xl">
                <thead>
                  <tr className="bg-blue-200">
                    {['ลำดับ', 'เวลา', 'ป้ายทะเบียน', 'ประเภท', 'กล้อง LPR', 'สถานที่', 'ภาพป้ายทะเบียน', 'ภาพรถ'].map(h => (
                      <th key={h} scope="col" className="text-left text-xl font-bold text-navy-700 px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r, idx) => (
                    <tr key={r.id} className={`border-b border-blue-100 hover:bg-blue-100 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-blue-50'}`}>
                      <td className="px-4 py-2.5 text-gray-700">{pageOffset + idx + 1}</td>
                      <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{r.timestamp}</td>
                      <td className="px-4 py-2.5">
                        <span className="font-mono font-bold text-navy-700 border-2 border-navy-200 rounded-lg px-3 py-1 bg-blue-50">{r.plate}</span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-700">{r.type}</td>
                      <td className="px-4 py-2.5 text-gray-700">{r.cameraId}</td>
                      <td className="px-4 py-2.5 text-gray-700">{r.road}</td>
                      <td className="px-4 py-2.5">
                        <div className="inline-flex flex-col items-center justify-center border-2 border-gray-800 rounded px-2 py-1 bg-white min-w-[90px]">
                          <span className="text-sm font-bold text-gray-900 leading-tight">{r.plate}</span>
                          <span className="text-[10px] text-gray-500 leading-tight">{districtOf(r.road).split(' / ')[1] ?? 'ชลบุรี'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <img
                          src={carPhotoSrc(pageOffset + idx)}
                          alt={`ภาพรถทะเบียน ${r.plate}`}
                          className="w-16 h-10 object-cover rounded-lg border border-gray-200"
                        />
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
