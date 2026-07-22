import { useMemo, useRef, useState } from 'react';
import { Activity, BarChart3, Download, TrendingDown, TrendingUp, Users, Clock, HardDrive } from 'lucide-react';
import { Layout } from '../components/Layout';
import { ExportButtons } from '../components/ExportButtons';
import { savedRequests } from '../utils/requestStorage';
import { savedUsers } from '../utils/userStorage';
import { exportElementToPdf, exportRowsToExcel, todayStamp } from '../utils/exportReport';
import { formatThaiDateTime } from '../utils/formatDate';
import { POLICE_STATION_OPTIONS, POLICE_AREA_GROUPS } from '../types';
import {
  availableMonths, availablePurposes, policeUsageByStation, prevMonthKey, formatHoursMinutes,
} from '../utils/policeUsageStats';

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
}

function SummaryCard({ icon: Icon, label, value, trendPct, gradient }: {
  icon: React.ElementType; label: string; value: string; trendPct: number | null; gradient: string;
}) {
  return (
    <div className={`group rounded-2xl shadow-md p-5 flex flex-col gap-3 ${gradient} hover:shadow-xl transition-shadow duration-300`}>
      <div className="flex items-center justify-between">
        <p className="text-lg font-extrabold text-white leading-tight">{label}</p>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/20 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-300">
          <Icon size={22} className="text-white" />
        </div>
      </div>
      <p className="text-4xl font-extrabold text-white leading-none">{value}</p>
      {trendPct !== null && (
        <p className="text-base font-semibold flex items-center gap-1 text-white">
          {trendPct >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
          {trendPct >= 0 ? '+' : ''}{trendPct.toFixed(1)}% จากเดือนก่อนหน้า
        </p>
      )}
    </div>
  );
}

export function PoliceUsageReportPage() {
  const requests = useMemo(() => savedRequests(), []);
  const users = useMemo(() => savedUsers(), []);
  const months = useMemo(() => availableMonths(requests, users), [requests, users]);
  const purposes = useMemo(() => availablePurposes(requests, users), [requests, users]);

  const [month, setMonth] = useState<string>(months[0] ?? 'all');
  const [station, setStation] = useState('all');
  const [area, setArea] = useState('all');
  const [purpose, setPurpose] = useState('all');
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const clearFilters = () => {
    setMonth(months[0] ?? 'all');
    setStation('all');
    setArea('all');
    setPurpose('all');
  };

  let rows = policeUsageByStation(requests, users, month, purpose);
  if (station !== 'all') rows = rows.filter(r => r.station === station);
  if (area !== 'all') rows = rows.filter(r => r.area === area);

  const totalCount = rows.reduce((s, r) => s + r.count, 0);
  const totalOfficers = rows.reduce((s, r) => s + r.officers, 0);
  const totalMinutes = rows.reduce((s, r) => s + r.totalMinutes, 0);
  const totalDownloads = rows.reduce((s, r) => s + r.downloads, 0);
  const avgMinutes = totalCount > 0 ? totalMinutes / totalCount : 0;

  let overallTrend: number | null = null;
  if (month !== 'all') {
    const prevRows = policeUsageByStation(requests, users, prevMonthKey(month), purpose)
      .filter(r => station === 'all' || r.station === station)
      .filter(r => area === 'all' || r.area === area);
    const prevCount = prevRows.reduce((s, r) => s + r.count, 0);
    overallTrend = prevCount === 0 ? (totalCount > 0 ? 100 : 0) : ((totalCount - prevCount) / prevCount) * 100;
  }

  const exportRows: (string | number)[][] = [
    ['ลำดับ', 'สถานีตำรวจ', 'กลุ่มพื้นที่', 'จำนวนการเข้าใช้งาน (ครั้ง)', 'ระยะเวลารวม (ชม.)', 'เฉลี่ยต่อครั้ง (ชม.)', 'จำนวนเจ้าหน้าที่', 'จำนวนดาวน์โหลด', 'แนวโน้ม (%)'],
    ...rows.map((r, i) => [
      i + 1, r.station, r.area, r.count,
      formatHoursMinutes(r.totalMinutes), formatHoursMinutes(r.count > 0 ? r.totalMinutes / r.count : 0),
      r.officers, r.downloads, r.trendPct !== null ? r.trendPct.toFixed(1) : '-',
    ]),
    ['', 'รวมทั้งหมด', '', totalCount, formatHoursMinutes(totalMinutes), formatHoursMinutes(avgMinutes), totalOfficers, totalDownloads, overallTrend !== null ? overallTrend.toFixed(1) : '-'],
  ];

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (exporting) return;
    setExporting(true);
    try {
      const filename = `สถิติการเข้าใช้งานตำรวจ-${todayStamp()}`;
      if (format === 'excel') {
        await exportRowsToExcel(exportRows, 'สถิติตำรวจ', `${filename}.xlsx`);
      } else if (reportRef.current) {
        await exportElementToPdf(reportRef.current, `${filename}.pdf`);
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <Layout>
      <div className="p-5 space-y-5 max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-navy-700 rounded-xl flex items-center justify-center flex-shrink-0">
              <BarChart3 size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">รายงานสรุปสถิติการเข้าใช้งานย้อนหลัง</h1>
              <p className="text-lg text-gray-500">สรุปข้อมูลการเข้าใช้งานเพื่อขอดูภาพย้อนหลัง (Playback) ของเจ้าหน้าที่ตำรวจแต่ละสถานีตำรวจ (สภ.)</p>
            </div>
          </div>
          <ExportButtons disabled={exporting} onPdf={() => handleExport('pdf')} onExcel={() => handleExport('excel')} />
        </div>

        <div ref={reportRef}>
          {/* Filters */}
          <div className="card p-4 mb-4">
            <div className="flex flex-wrap items-center gap-3" data-html2canvas-ignore>
              <div>
                <label htmlFor="pu-month" className="label">ช่วงเวลา</label>
                <select id="pu-month" value={month} onChange={e => setMonth(e.target.value)} className="input-field w-auto">
                  <option value="all">ทุกเดือน</option>
                  {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="pu-station" className="label">สถานีตำรวจ (สภ.)</label>
                <select id="pu-station" value={station} onChange={e => setStation(e.target.value)} className="input-field w-auto">
                  <option value="all">ทั้งหมด</option>
                  {POLICE_STATION_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="pu-area" className="label">กลุ่มพื้นที่</label>
                <select id="pu-area" value={area} onChange={e => setArea(e.target.value)} className="input-field w-auto">
                  <option value="all">ทั้งหมด</option>
                  {POLICE_AREA_GROUPS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="pu-purpose" className="label">ประเภทการเข้าใช้งาน</label>
                <select id="pu-purpose" value={purpose} onChange={e => setPurpose(e.target.value)} className="input-field w-auto">
                  <option value="all">ทั้งหมด</option>
                  {purposes.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <button onClick={clearFilters} className="btn-secondary self-end">ล้างตัวกรอง</button>
            </div>
          </div>

          <p className="text-base text-gray-500 mb-3">
            ตัวกรองที่เลือก: {month === 'all' ? 'ทุกเดือน' : monthLabel(month)} • สภ. {station === 'all' ? 'ทั้งหมด' : station} • พื้นที่ {area === 'all' ? 'ทั้งหมด' : area} • ประเภท {purpose === 'all' ? 'ทั้งหมด' : purpose}
          </p>

          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <SummaryCard icon={Activity} label="จำนวนการเข้าใช้งานทั้งหมด" value={`${totalCount.toLocaleString()} ครั้ง`} trendPct={overallTrend} gradient="bg-gradient-to-br from-blue-500 to-blue-700" />
            <SummaryCard icon={Users} label="จำนวนเจ้าหน้าที่ที่เข้าใช้งาน" value={`${totalOfficers.toLocaleString()} คน`} trendPct={null} gradient="bg-gradient-to-br from-cyan-500 to-cyan-700" />
            <SummaryCard icon={Clock} label="ระยะเวลาการใช้งานรวม" value={`${formatHoursMinutes(totalMinutes)} ชม.`} trendPct={null} gradient="bg-gradient-to-br from-violet-500 to-purple-700" />
            <SummaryCard icon={Clock} label="เฉลี่ยต่อการเข้าใช้งาน" value={`${formatHoursMinutes(avgMinutes)} ชม./ครั้ง`} trendPct={null} gradient="bg-gradient-to-br from-amber-500 to-orange-700" />
            <SummaryCard icon={Download} label="จำนวนการดาวน์โหลด" value={`${totalDownloads.toLocaleString()} ครั้ง`} trendPct={null} gradient="bg-gradient-to-br from-emerald-500 to-green-700" />
          </div>

          {/* Ranked table */}
          <div className="card overflow-hidden p-0">
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-blue-50 border-b-2 border-blue-100">
              <div className="w-9 h-9 bg-navy-700 rounded-lg flex items-center justify-center flex-shrink-0">
                <HardDrive size={20} className="text-white" />
              </div>
              <h3 className="font-extrabold text-navy-700 text-2xl">สถิติการเข้าใช้งาน จำแนกตามสถานีตำรวจ (สภ.)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="text-left text-base font-semibold text-gray-600 px-4 py-2.5">ลำดับ</th>
                    <th scope="col" className="text-left text-base font-semibold text-gray-600 px-4 py-2.5">สถานีตำรวจ (สภ.)</th>
                    <th scope="col" className="text-right text-base font-semibold text-gray-600 px-4 py-2.5">จำนวนการเข้าใช้งาน (ครั้ง)</th>
                    <th scope="col" className="text-right text-base font-semibold text-gray-600 px-4 py-2.5">ระยะเวลารวม (ชม.)</th>
                    <th scope="col" className="text-right text-base font-semibold text-gray-600 px-4 py-2.5">เฉลี่ยต่อการเข้าใช้งาน (ชม.)</th>
                    <th scope="col" className="text-right text-base font-semibold text-gray-600 px-4 py-2.5">จำนวนเจ้าหน้าที่ (คน)</th>
                    <th scope="col" className="text-right text-base font-semibold text-gray-600 px-4 py-2.5">จำนวนการดาวน์โหลด (ครั้ง)</th>
                    <th scope="col" className="text-right text-base font-semibold text-gray-600 px-4 py-2.5">แนวโน้ม</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</td></tr>
                  ) : rows.map((r, i) => (
                    <tr key={r.station} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-700">{i + 1}</td>
                      <td className="px-4 py-2.5 font-bold text-gray-900">{r.station}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{r.count.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{formatHoursMinutes(r.totalMinutes)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{formatHoursMinutes(r.count > 0 ? r.totalMinutes / r.count : 0)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{r.officers}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{r.downloads}</td>
                      <td className="px-4 py-2.5 text-right">
                        {r.trendPct === null ? (
                          <span className="text-gray-400">-</span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 font-bold ${r.trendPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {r.trendPct >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                            {r.trendPct >= 0 ? '+' : ''}{r.trendPct.toFixed(1)}%
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {rows.length > 0 && (
                    <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                      <td className="px-4 py-2.5" />
                      <td className="px-4 py-2.5 text-gray-900">รวมทั้งหมด</td>
                      <td className="px-4 py-2.5 text-right text-gray-900">{totalCount.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right text-gray-900">{formatHoursMinutes(totalMinutes)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-900">{formatHoursMinutes(avgMinutes)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-900">{totalOfficers}</td>
                      <td className="px-4 py-2.5 text-right text-gray-900">{totalDownloads}</td>
                      <td className="px-4 py-2.5 text-right text-gray-900">
                        {overallTrend !== null ? `${overallTrend >= 0 ? '+' : ''}${overallTrend.toFixed(1)}%` : '-'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-base text-gray-400 px-4 py-3 border-t border-gray-100">
              หมายเหตุ: ข้อมูลอัปเดตล่าสุด ณ วันที่ {formatThaiDateTime(new Date().toISOString())}
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
