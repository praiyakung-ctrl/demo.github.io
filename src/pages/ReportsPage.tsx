import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, BarChart2, Car, Crosshair, ParkingSquare, Waves, Users, MapPin, Clock, ArrowDownLeft, ArrowUpRight, Wifi } from 'lucide-react';
import { ExportButtons } from '../components/ExportButtons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Layout } from '../components/Layout';
import lprData from '../data/lpr.json';
import camerasData from '../data/cameras.json';
import type { Camera, MonthlyEventData, LprRoad } from '../types';
import { EVENT_LABELS, EVENT_TEXT_COLORS } from '../types';
import { exportChartWithTableToExcel, exportElementToPdf, exportRowsToExcel, todayStamp } from '../utils/exportReport';

const monthly = lprData.monthly as MonthlyEventData[];

/* NT MPLS link summary per installation site, in CAM-ID order.
   LPR/Unity 8 are per-camera rates; Total Link = cameras × (LPR + Unity 8). */
const mplsSites = (() => {
  const sites: { location: string; count: number; lprMbps: number; unityMbps: number; totalMbps: number }[] = [];
  for (const cam of camerasData as Camera[]) {
    let site = sites.find(s => s.location === cam.location);
    if (!site) {
      site = { location: cam.location, count: 0, lprMbps: cam.lprMbps, unityMbps: cam.unityMbps, totalMbps: 0 };
      sites.push(site);
    }
    site.count += 1;
    site.totalMbps += cam.lprMbps + cam.unityMbps;
  }
  return sites;
})();
const mplsTotal = {
  count: mplsSites.reduce((s, x) => s + x.count, 0),
  totalMbps: mplsSites.reduce((s, x) => s + x.totalMbps, 0),
};
const roads = lprData.roads as LprRoad[];
const entries = lprData.entries as { id: string; plate: string; road: string; timestamp: string; direction: string; type: string }[];

const EVENT_COLORS_MAP: Record<string, string> = {
  traffic: '#F97316', gunshot: '#EF4444', parking: '#92400E', flood: '#3B82F6', crowd: '#EAB308',
};

const VEHICLE_TYPE_STYLES: Record<string, string> = {
  'รถยนต์':         'bg-blue-100 text-blue-700 border border-blue-300',
  'รถกระบะ':        'bg-amber-100 text-amber-700 border border-amber-300',
  'รถบรรทุก':       'bg-purple-100 text-purple-700 border border-purple-300',
  'รถจักรยานยนต์':  'bg-teal-100 text-teal-700 border border-teal-300',
};

const RANK_COLORS = [
  '#F59E0B', '#9CA3AF', '#B45309',
  '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#14B8A6', '#10B981', '#F97316',
];

const EVENT_TYPES = ['traffic', 'gunshot', 'parking', 'flood', 'crowd'] as const;

const EVENT_TYPE_ICONS = {
  traffic: Car,
  gunshot: Crosshair,
  parking: ParkingSquare,
  flood:   Waves,
  crowd:   Users,
} as const;
const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.'];

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; color: string; dataKey: string; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 min-w-[180px]">
      <p className="text-base font-bold text-navy-700 mb-2">{label} 2568</p>
      {payload.map(entry => {
        const Icon = EVENT_TYPE_ICONS[entry.dataKey as keyof typeof EVENT_TYPE_ICONS];
        return (
          <div key={entry.dataKey} className="flex items-center gap-2 py-0.5">
            {Icon && <Icon size={15} style={{ color: entry.color }} />}
            <span className="text-base font-medium flex-1" style={{ color: entry.color }}>{entry.name}</span>
            <span className="text-base font-bold" style={{ color: entry.color }}>{entry.value}</span>
          </div>
        );
      })}
    </div>
  );
}

function ChartLegend({ payload }: { payload?: { value: string; color: string; dataKey: string }[] }) {
  if (!payload) return null;
  return (
    <div className="flex flex-wrap justify-center gap-4 pt-2">
      {payload.map(entry => {
        const Icon = EVENT_TYPE_ICONS[entry.dataKey as keyof typeof EVENT_TYPE_ICONS];
        return (
          <div key={entry.dataKey} className="flex items-center gap-1.5">
            {Icon && <Icon size={16} style={{ color: entry.color }} />}
            <span className="text-base font-medium" style={{ color: entry.color }}>{entry.value}</span>
          </div>
        );
      })}
    </div>
  );
}

export function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set(EVENT_TYPES));

  const toggleType = (type: string) => {
    setSelectedTypes(prev => {
      const n = new Set(prev);
      if (n.has(type)) n.delete(type); else n.add(type);
      return n;
    });
  };

  const filteredMonthly = selectedMonth === 'all'
    ? monthly
    : monthly.filter((_r, i) => String(i + 1) === selectedMonth);

  const eventsRef = useRef<HTMLDivElement>(null);
  const mplsRef = useRef<HTMLDivElement>(null);
  const lprRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const activeTypes = EVENT_TYPES.filter(t => selectedTypes.has(t));

  const excelRows: Record<string, (string | number)[][]> = {
    'CCTV Events': [
      ['เดือน', ...activeTypes.map(t => EVENT_LABELS[t]), 'รวมทั้งหมด'],
      ...filteredMonthly.map(row => [
        `${row.month} 2568`,
        ...activeTypes.map(t => row[t] ?? 0),
        EVENT_TYPES.reduce((s, t) => s + (row[t] ?? 0), 0),
      ]),
    ],
    'NT MPLS': [
      ['จุดติดตั้ง', 'สถานที่ติดตั้งเสาและกล้อง', 'จำนวนกล้อง', 'LPR (Mbps)', 'Unity 8 (Mbps)', 'Total Link NT MPLS (Mbps)'],
      ...mplsSites.map((s, i) => [i + 1, s.location, s.count, s.lprMbps, s.unityMbps, s.totalMbps]),
      ['', 'รวม', mplsTotal.count, '', '', mplsTotal.totalMbps],
    ],
    'LPR': [
      ['อันดับ', 'ถนน', 'จำนวน (คัน/วัน)'],
      ...roads.map((r, i) => [i + 1, r.road, r.count]),
    ],
  };

  const handleExport = async (section: string, format: string) => {
    if (exporting) return;
    setExporting(true);
    try {
      const filename = `รายงาน-${section.replace(/\s+/g, '-')}-${todayStamp()}`;
      if (format === 'Excel') {
        // the CCTV Events card contains a chart — embed its image in the Excel file too
        if (section === 'CCTV Events' && eventsRef.current) {
          await exportChartWithTableToExcel(eventsRef.current, excelRows[section], section, `${filename}.xlsx`);
        } else {
          await exportRowsToExcel(excelRows[section], section, `${filename}.xlsx`);
        }
      } else {
        const el = { 'CCTV Events': eventsRef, 'NT MPLS': mplsRef, 'LPR': lprRef }[section]?.current;
        if (el) await exportElementToPdf(el, `${filename}.pdf`);
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <Layout>
      <div className="p-5 space-y-5 max-w-screen-xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-gray-900">รายงาน</h1>
          <p className="text-xl text-gray-900 font-bold">ข้อมูลเหตุการณ์ CCTV และ LPR จังหวัดชลบุรี</p>
        </div>

        {/* Entry point: police usage KPI report */}
        <div className="card flex flex-wrap items-center justify-between gap-3 bg-navy-700 text-white">
          <div className="flex items-center gap-3">
            <Wifi size={28} className="flex-shrink-0" />
            <div>
              <h3 className="font-bold text-xl">รายงานสถิติการเข้าใช้งานของตำรวจ (KPI)</h3>
              <p className="text-lg text-blue-100">สรุปการขอดู Playback CCTV รายเดือน แยกตามสถานีตำรวจ (สภ.)</p>
            </div>
          </div>
          <Link to="/reports/police-usage" className="bg-white text-navy-700 font-bold text-lg px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap">
            ดูรายงาน
          </Link>
        </div>

        {/* Filter card */}
        <div className="card p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Month */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-lg font-bold text-gray-900 whitespace-nowrap">เดือน:</span>
              <select
                aria-label="เลือกเดือน"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="input-field py-1.5 text-lg w-40"
              >
                <option value="all">ทุกเดือน</option>
                {MONTHS.map((m, i) => <option key={i} value={String(i + 1)}>{m} 2568</option>)}
              </select>
            </div>

            {/* Divider */}
            <div className="w-px h-10 bg-gray-200 flex-shrink-0" />

            {/* Event type filter */}
            <div className="flex items-center gap-2 flex-wrap flex-1">
              <span className="text-lg font-bold text-gray-900 whitespace-nowrap flex-shrink-0">เหตุการณ์:</span>
              <button
                onClick={() => setSelectedTypes(new Set(EVENT_TYPES))}
                className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg border-2 font-bold text-sm shadow-sm transition-all flex-shrink-0 ${
                  selectedTypes.size === EVENT_TYPES.length
                    ? 'bg-navy-700 text-white border-navy-700'
                    : 'bg-white text-navy-700 border-navy-300 hover:bg-navy-50'
                }`}
              >
                ทั้งหมด
              </button>
              {EVENT_TYPES.map(type => {
                const Icon = EVENT_TYPE_ICONS[type];
                const active = selectedTypes.has(type);
                return (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg border-2 font-bold text-sm shadow-sm transition-all flex-shrink-0 ${
                      active ? 'text-white shadow-md' : 'bg-white text-navy-700 hover:brightness-95'
                    }`}
                    style={active
                      ? { backgroundColor: EVENT_COLORS_MAP[type], borderColor: EVENT_COLORS_MAP[type] }
                      : { borderColor: EVENT_COLORS_MAP[type] }}
                  >
                    <Icon size={14} className="flex-shrink-0" style={{ color: active ? 'white' : EVENT_COLORS_MAP[type] }} />
                    {EVENT_LABELS[type]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 1: CCTV Events */}
        <div ref={eventsRef} className="card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <FileText size={24} className="text-navy-700" />
              <h3 className="font-bold text-gray-900 text-xl">รายงานเหตุการณ์ CCTV รายเดือน (2568)</h3>
            </div>
            <ExportButtons disabled={exporting} onPdf={() => handleExport('CCTV Events', 'PDF')} onExcel={() => handleExport('CCTV Events', 'Excel')} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xl">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="text-left text-lg font-semibold text-gray-600 px-4 py-2.5">เดือน</th>
                  {EVENT_TYPES.filter(t => selectedTypes.has(t)).map(t => (
                    <th key={t} scope="col" className="text-right text-lg font-semibold px-4 py-2.5" style={{ color: EVENT_TEXT_COLORS[t] }}>
                      {EVENT_LABELS[t]}
                    </th>
                  ))}
                  <th scope="col" className="text-right text-lg font-semibold text-gray-600 px-4 py-2.5">รวมทั้งหมด</th>
                </tr>
              </thead>
              <tbody>
                {filteredMonthly.map(row => {
                  const total = EVENT_TYPES.reduce((sum, t) => sum + (row[t] ?? 0), 0);
                  return (
                    <tr key={row.month} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-900">{row.month} 2568</td>
                      {EVENT_TYPES.filter(t => selectedTypes.has(t)).map(t => (
                        <td key={t} className="px-4 py-2.5 text-right text-gray-700">{row[t]}</td>
                      ))}
                      <td className="px-4 py-2.5 text-right font-bold text-gray-900">{total}</td>
                    </tr>
                  );
                })}
                {filteredMonthly.length > 1 && (
                  <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                    <td className="px-4 py-2.5 text-gray-900">รวม</td>
                    {EVENT_TYPES.filter(t => selectedTypes.has(t)).map(t => (
                      <td key={t} className="px-4 py-2.5 text-right" style={{ color: EVENT_TEXT_COLORS[t] }}>
                        {filteredMonthly.reduce((sum, r) => sum + (r[t] ?? 0), 0)}
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-right text-gray-900">
                      {filteredMonthly.reduce((sum, r) => sum + EVENT_TYPES.reduce((s, t) => s + (r[t] ?? 0), 0), 0)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Bar chart */}
          <div
            className="p-4 border-t border-gray-100"
            role="img"
            aria-label="กราฟแท่งจำนวนเหตุการณ์ CCTV รายเดือน แยกตามประเภทเหตุการณ์ ข้อมูลเดียวกับตารางด้านบน"
          >
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={filteredMonthly} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 16 }} />
                <YAxis tick={{ fontSize: 15 }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend content={<ChartLegend />} />
                {EVENT_TYPES.filter(t => selectedTypes.has(t)).map(t => (
                  <Bar key={t} dataKey={t} name={EVENT_LABELS[t]} stackId="a" fill={EVENT_COLORS_MAP[t]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Section: NT MPLS network links */}
        <div ref={mplsRef} className="card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Wifi size={24} className="text-navy-700" />
              <h3 className="font-bold text-gray-900 text-xl">โครงข่ายสื่อสาร NT MPLS รายจุดติดตั้ง</h3>
            </div>
            <ExportButtons disabled={exporting} onPdf={() => handleExport('NT MPLS', 'PDF')} onExcel={() => handleExport('NT MPLS', 'Excel')} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xl">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="text-center text-lg font-semibold text-gray-600 px-4 py-2.5">จุดติดตั้ง</th>
                  <th scope="col" className="text-left text-lg font-semibold text-gray-600 px-4 py-2.5">สถานที่ติดตั้งเสาและกล้อง</th>
                  <th scope="col" className="text-right text-lg font-semibold text-gray-600 px-4 py-2.5">จำนวนกล้อง</th>
                  <th scope="col" className="text-right text-lg font-semibold text-gray-600 px-4 py-2.5">LPR (Mbps)</th>
                  <th scope="col" className="text-right text-lg font-semibold text-gray-600 px-4 py-2.5">Unity 8 (Mbps)</th>
                  <th scope="col" className="text-right text-lg font-semibold text-gray-600 px-4 py-2.5">Total Link NT MPLS (Mbps)</th>
                </tr>
              </thead>
              <tbody>
                {mplsSites.map((site, i) => (
                  <tr key={site.location} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-center text-gray-700">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{site.location}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{site.count}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{site.lprMbps}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{site.unityMbps}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-gray-900">{site.totalMbps}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                  <td className="px-4 py-2.5" />
                  <td className="px-4 py-2.5 text-gray-900">รวม</td>
                  <td className="px-4 py-2.5 text-right text-gray-900">{mplsTotal.count}</td>
                  <td className="px-4 py-2.5" />
                  <td className="px-4 py-2.5" />
                  <td className="px-4 py-2.5 text-right text-gray-900">{mplsTotal.totalMbps}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="px-4 pb-4 pt-2 text-base text-gray-500">
            อัตรารับส่งข้อมูลต่อกล้อง: LPR 6 Mbps และ Unity 8 จำนวน 6 Mbps — Total Link = จำนวนกล้อง × 12 Mbps
          </p>
        </div>

        {/* Section 2: LPR */}
        <div ref={lprRef} className="card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <BarChart2 size={24} className="text-navy-700" />
              <h3 className="font-bold text-gray-900 text-xl">รายงาน LPR แยกถนน Top 10</h3>
            </div>
            <ExportButtons disabled={exporting} onPdf={() => handleExport('LPR', 'PDF')} onExcel={() => handleExport('LPR', 'Excel')} />
          </div>

          <div className="p-4 space-y-3">
            {roads.map((road, idx) => {
              const total = roads.reduce((s, r) => s + r.count, 0);
              const pct = (road.count / total) * 100;
              const color = RANK_COLORS[idx] ?? '#3B82F6';
              const medalLabel = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
              return (
                <div key={road.road} className="rounded-xl border-2 p-4 hover:shadow-md transition-shadow" style={{ borderColor: color + '40', backgroundColor: color + '08' }}>
                  <div className="flex items-center gap-4">
                    {/* Rank badge */}
                    <div className="w-12 h-12 rounded-full flex items-center justify-center font-extrabold text-xl text-white flex-shrink-0 shadow-md" style={{ backgroundColor: color }}>
                      {medalLabel ?? idx + 1}
                    </div>
                    {/* Road info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xl text-navy-700 truncate">{road.road}</span>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                          <span className="font-extrabold text-xl" style={{ color }}>{road.count.toLocaleString()}</span>
                          <span className="text-lg text-gray-500">คัน/วัน</span>
                          <span className="font-bold text-xl w-16 text-right" style={{ color }}>{pct.toFixed(1)}%</span>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: LPR entries */}
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-gray-100">
            <Car size={22} className="text-navy-700" />
            <h3 className="font-bold text-navy-700 text-xl">บันทึก LPR ล่าสุด (10 รายการ)</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {entries.map((e, idx) => (
              <div key={e.id} className={`flex items-center gap-4 px-5 py-3 hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}`}>
                {/* License plate badge */}
                <div className="flex-shrink-0 bg-amber-400 border-2 border-amber-600 rounded-lg px-2 py-0.5 min-w-[90px] text-center shadow-sm">
                  <span className="font-extrabold text-base text-gray-900 font-mono tracking-widest">{e.plate}</span>
                </div>
                {/* Road */}
                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  <MapPin size={20} className="text-navy-500 flex-shrink-0" />
                  <span className="font-medium text-navy-700 text-2xl truncate">{e.road}</span>
                </div>
                {/* Timestamp */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Clock size={18} className="text-gray-400" />
                  <span className="text-lg text-gray-900 whitespace-nowrap">{e.timestamp}</span>
                </div>
                {/* Direction */}
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-base flex-shrink-0 ${
                  e.direction === 'ขาเข้า' ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-orange-100 text-orange-700 border border-orange-300'
                }`}>
                  {e.direction === 'ขาเข้า' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                  {e.direction}
                </div>
                {/* Vehicle type */}
                <div className="flex-shrink-0">
                  <span className={`inline-flex items-center text-lg font-bold px-3 py-1.5 rounded-full ${VEHICLE_TYPE_STYLES[e.type] ?? 'bg-gray-100 text-gray-600 border border-gray-300'}`}>
                    {e.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
