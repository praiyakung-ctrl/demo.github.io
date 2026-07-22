import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { GitCompare, Shield, AlertTriangle, Car, TrendingUp, TrendingDown } from 'lucide-react';
import { Layout } from '../components/Layout';
import { ExportButtons } from '../components/ExportButtons';
import { exportElementToPdf, exportRowsToExcel, todayStamp } from '../utils/exportReport';
import { formatThaiDateTime } from '../utils/formatDate';
import { EVENT_LABELS } from '../types';
import type { EventType } from '../types';
import policeUsageData from '../data/comparisonPoliceUsage.json';
import cctvEventsData from '../data/comparisonCctvEvents.json';
import lprRoadsData from '../data/comparisonLprRoads.json';
import {
  type UsageRecord, type Granularity,
  filterByPeriod, previousPeriod, totalCount, distinctGroups,
  groupTotals, categoryTotals, yearlySeries, seriesByYear, heatmapPattern, quarterOf,
  HEATMAP_HOUR_LABELS,
} from '../utils/comparisonStats';

type Topic = 'police' | 'events' | 'lpr';

const YEAR_COLORS = ['#94A3B8', '#38BDF8', '#1B3A6B', '#22C55E', '#F59E0B'];
const CATEGORY_COLORS = ['#1B3A6B', '#0E7490', '#CA8A04', '#DC2626', '#7C3AED', '#059669'];

function categoryLabel(topic: Topic, category: string): string {
  if (topic === 'events') return EVENT_LABELS[category as EventType] ?? category;
  return category;
}

const TOPIC_CONFIG: Record<Topic, {
  label: string; icon: React.ElementType; data: UsageRecord[];
  groupLabel: string; categoryLabel: string; countLabel: string;
  totalGroups: number; linkTo?: string; linkLabel?: string;
}> = {
  police: {
    label: 'ตำรวจ Playback', icon: Shield, data: policeUsageData as UsageRecord[],
    groupLabel: 'สถานีตำรวจ (สภ.)', categoryLabel: 'ประเภทเหตุจูงใจ', countLabel: 'จำนวนการดู Playback',
    totalGroups: 6, linkTo: '/reports/police-usage', linkLabel: 'ดูรายงานเต็ม',
  },
  events: {
    label: 'เหตุการณ์ CCTV', icon: AlertTriangle, data: cctvEventsData as UsageRecord[],
    groupLabel: 'พื้นที่/อำเภอ', categoryLabel: 'ประเภทเหตุการณ์', countLabel: 'จำนวนเหตุการณ์',
    totalGroups: 6,
  },
  lpr: {
    label: 'LPR รายถนน', icon: Car, data: lprRoadsData as UsageRecord[],
    groupLabel: 'ถนน', categoryLabel: 'ประเภทรถ', countLabel: 'จำนวนการอ่านป้ายทะเบียน',
    totalGroups: 10,
  },
};

function daysInPeriod(granularity: Granularity, year: number, month?: number, quarter?: number): number {
  const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();
  if (granularity === 'month') return daysInMonth(year, month ?? 1);
  if (granularity === 'quarter') {
    const q = quarter ?? 1;
    return [1, 2, 3].map(i => daysInMonth(year, (q - 1) * 3 + i)).reduce((s, d) => s + d, 0);
  }
  return (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 366 : 365;
}

function periodLabel(granularity: Granularity, year: number, month?: number, quarter?: number): string {
  const beYear = year + 543;
  if (granularity === 'year') return `ปี ${beYear}`;
  if (granularity === 'quarter') return `ไตรมาส ${quarter} ปี ${beYear}`;
  const MONTH_NAMES = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  return `${MONTH_NAMES[(month ?? 1) - 1]} ${beYear}`;
}

function SummaryCard({ icon: Icon, label, value, trendPct, color }: {
  icon: React.ElementType; label: string; value: string; trendPct: number | null; color: string;
}) {
  return (
    <div className="card flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-lg font-bold text-gray-500">{label}</p>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}22`, color }}>
          <Icon size={20} />
        </div>
      </div>
      <p className="text-3xl font-extrabold text-navy-700 leading-none truncate">{value}</p>
      {trendPct !== null && (
        <p className={`text-base font-bold flex items-center gap-1 ${trendPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trendPct >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
          {trendPct >= 0 ? '+' : ''}{trendPct.toFixed(1)}% จากช่วงก่อนหน้า
        </p>
      )}
    </div>
  );
}

export function ComparisonReportPage() {
  const [topic, setTopic] = useState<Topic>('police');
  const [granularity, setGranularity] = useState<Granularity>('month');
  const [trendGranularity, setTrendGranularity] = useState<'month' | 'quarter' | 'year'>('month');
  const [groupFilter, setGroupFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const config = TOPIC_CONFIG[topic];
  const rows = config.data;
  const years = [...new Set(rows.map(r => r.year))].sort();
  const latestYear = years[years.length - 1];
  const monthsInLatestYear = [...new Set(rows.filter(r => r.year === latestYear).map(r => r.month))].sort((a, b) => a - b);
  const latestMonth = monthsInLatestYear[monthsInLatestYear.length - 1] ?? 1;

  const [year, setYear] = useState(latestYear);
  const [month, setMonth] = useState(latestMonth);
  const [quarter, setQuarter] = useState(quarterOf(latestMonth));

  const availableMonths = [...new Set(rows.filter(r => r.year === year).map(r => r.month))].sort((a, b) => a - b);
  const availableQuarters = [...new Set(availableMonths.map(m => quarterOf(m)))].sort((a, b) => a - b);
  const groupOptions = [...new Set(rows.map(r => r.group))].sort();
  const categoryOptions = [...new Set(rows.map(r => r.category))].sort();

  const clearFilters = () => {
    setGroupFilter('all');
    setCategoryFilter('all');
    setYear(latestYear);
    setMonth(latestMonth);
    setQuarter(quarterOf(latestMonth));
  };

  const dimFilter = (r: UsageRecord) =>
    (groupFilter === 'all' || r.group === groupFilter) && (categoryFilter === 'all' || r.category === categoryFilter);

  const scopedRows = rows.filter(dimFilter);
  const filtered = filterByPeriod(scopedRows, granularity, year, month, quarter);
  const prev = previousPeriod(granularity, year, month, quarter);
  const prevFiltered = filterByPeriod(scopedRows, granularity, prev.year, prev.month, prev.quarter);

  const currentTotal = totalCount(filtered);
  const prevTotal = totalCount(prevFiltered);
  const overallTrend = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : (currentTotal > 0 ? 100 : 0);

  const groups = groupTotals(filtered, prevFiltered);
  const categories = categoryTotals(filtered);
  const yearly = yearlySeries(scopedRows, years);
  const ytdPrevYearTotal = yearly.length > 1 ? yearly[yearly.length - 2].count : 0;
  const ytdCurrentYearTotal = yearly[yearly.length - 1]?.count ?? 0;
  const ytdPct = ytdPrevYearTotal > 0 ? ((ytdCurrentYearTotal - ytdPrevYearTotal) / ytdPrevYearTotal) * 100 : null;

  const trendSeries = trendGranularity === 'year'
    ? yearly.map(y => ({ label: String(y.year + 543), value: y.count }))
    : seriesByYear(scopedRows, years, trendGranularity);

  const days = daysInPeriod(granularity, year, month, quarter);
  const avgPerDay = days > 0 ? currentTotal / days : 0;

  const heatmap = heatmapPattern(currentTotal);
  const heatmapMax = Math.max(1, ...heatmap.flatMap(r => r.cells));

  const groupsTracked = distinctGroups(filtered);

  const exportRows: (string | number)[][] = [
    [`รายงานเปรียบเทียบ — ${config.label}`],
    ['ช่วงเวลา', periodLabel(granularity, year, month, quarter)],
    [config.countLabel, currentTotal],
    [''],
    ['ลำดับ', config.groupLabel, 'จำนวน', 'แนวโน้ม (%)'],
    ...groups.map((g, i) => [i + 1, g.group, g.count, g.trendPct !== null ? g.trendPct.toFixed(1) : '-']),
  ];

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (exporting) return;
    setExporting(true);
    try {
      const filename = `รายงานเปรียบเทียบ-${config.label}-${todayStamp()}`;
      if (format === 'excel') {
        await exportRowsToExcel(exportRows, 'รายงานเปรียบเทียบ', `${filename}.xlsx`);
      } else if (reportRef.current) {
        await exportElementToPdf(reportRef.current, `${filename}.pdf`);
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <Layout>
      <div className="p-5 space-y-4 max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-navy-700 rounded-xl flex items-center justify-center flex-shrink-0">
              <GitCompare size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">รายงานเปรียบเทียบ</h1>
              <p className="text-lg text-gray-500">เปรียบเทียบสถิติรายเดือน/ไตรมาส/ปี เพื่อวิเคราะห์แนวโน้มความปลอดภัยของเมือง</p>
            </div>
          </div>
          <ExportButtons disabled={exporting} onPdf={() => handleExport('pdf')} onExcel={() => handleExport('excel')} />
        </div>

        {/* Topic switcher */}
        <div className="flex flex-wrap gap-2" data-html2canvas-ignore>
          {(Object.keys(TOPIC_CONFIG) as Topic[]).map(t => {
            const Icon = TOPIC_CONFIG[t].icon;
            const active = topic === t;
            return (
              <button
                key={t}
                onClick={() => { setTopic(t); setGroupFilter('all'); setCategoryFilter('all'); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-bold text-lg transition-colors ${
                  active ? 'bg-navy-700 text-white border-navy-700' : 'bg-white text-navy-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Icon size={20} /> {TOPIC_CONFIG[t].label}
              </button>
            );
          })}
        </div>

        <div ref={reportRef}>
          {/* Filters */}
          <div className="card p-4 mb-4">
            <div className="flex flex-wrap items-end gap-3" data-html2canvas-ignore>
              <div>
                <label htmlFor="cr-granularity" className="label">ช่วงเวลา</label>
                <select id="cr-granularity" value={granularity} onChange={e => setGranularity(e.target.value as Granularity)} className="input-field w-auto">
                  <option value="month">รายเดือน</option>
                  <option value="quarter">รายไตรมาส</option>
                  <option value="year">รายปี</option>
                </select>
              </div>
              <div>
                <label htmlFor="cr-year" className="label">ปี</label>
                <select id="cr-year" value={year} onChange={e => setYear(Number(e.target.value))} className="input-field w-auto">
                  {years.map(y => <option key={y} value={y}>{y + 543}</option>)}
                </select>
              </div>
              {granularity === 'month' && (
                <div>
                  <label htmlFor="cr-month" className="label">เดือน</label>
                  <select id="cr-month" value={month} onChange={e => setMonth(Number(e.target.value))} className="input-field w-auto">
                    {(rows.filter(r => r.year === year).length > 0 ? [...new Set(rows.filter(r => r.year === year).map(r => r.month))].sort((a, b) => a - b) : [1]).map(m => (
                      <option key={m} value={m}>{periodLabel('month', year, m)}</option>
                    ))}
                  </select>
                </div>
              )}
              {granularity === 'quarter' && (
                <div>
                  <label htmlFor="cr-quarter" className="label">ไตรมาส</label>
                  <select id="cr-quarter" value={quarter} onChange={e => setQuarter(Number(e.target.value))} className="input-field w-auto">
                    {(availableQuarters.length > 0 ? availableQuarters : [1]).map(q => <option key={q} value={q}>ไตรมาส {q}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label htmlFor="cr-group" className="label">{config.groupLabel}</label>
                <select id="cr-group" value={groupFilter} onChange={e => setGroupFilter(e.target.value)} className="input-field w-auto">
                  <option value="all">ทั้งหมด</option>
                  {groupOptions.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="cr-category" className="label">{config.categoryLabel}</label>
                <select id="cr-category" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="input-field w-auto">
                  <option value="all">ทั้งหมด</option>
                  {categoryOptions.map(c => <option key={c} value={c}>{categoryLabel(topic, c)}</option>)}
                </select>
              </div>
              <button onClick={clearFilters} className="btn-secondary">ล้างตัวกรอง</button>
            </div>
            <p className="text-base text-gray-500 mt-3">
              กำลังดู: {periodLabel(granularity, year, month, quarter)} • เปรียบเทียบกับ {periodLabel(granularity, prev.year, prev.month, prev.quarter)}
            </p>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <SummaryCard icon={config.icon} label={`${config.countLabel}ทั้งหมด`} value={`${currentTotal.toLocaleString()} ครั้ง`} trendPct={overallTrend} color="#1B3A6B" />
            <SummaryCard icon={TrendingUp} label="เฉลี่ยต่อวัน" value={`${avgPerDay.toFixed(1)} ครั้ง`} trendPct={null} color="#0E7490" />
            <SummaryCard icon={config.icon} label={`${config.groupLabel}ที่มีการใช้งานสูงสุด`} value={groups[0]?.group ?? '-'} trendPct={null} color="#CA8A04" />
            <SummaryCard icon={config.icon} label={`${config.categoryLabel}ที่พบบ่อยที่สุด`} value={categories[0] ? categoryLabel(topic, categories[0].category) : '-'} trendPct={null} color="#7C3AED" />
            <SummaryCard icon={config.icon} label={`จำนวน${config.groupLabel}ที่มีการใช้งาน`} value={`${groupsTracked} จาก ${config.totalGroups}`} trendPct={null} color="#0F766E" />
          </div>

          {/* Multi-year trend line */}
          <div className="card p-4 mb-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h3 className="font-bold text-gray-900 text-xl">แนวโน้ม{config.countLabel} เทียบปีย้อนหลัง {years.length} ปี</h3>
              <div className="flex gap-1.5" data-html2canvas-ignore>
                {(['month', 'quarter', 'year'] as const).map(g => (
                  <button
                    key={g}
                    onClick={() => setTrendGranularity(g)}
                    className={`text-sm font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                      trendGranularity === g ? 'bg-navy-500 text-white border-navy-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {g === 'month' ? 'รายเดือน' : g === 'quarter' ? 'รายไตรมาส' : 'รายปี'}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              {trendGranularity === 'year' ? (
                <LineChart data={trendSeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 14 }} />
                  <YAxis tick={{ fontSize: 13 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" name={config.countLabel} stroke="#1B3A6B" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              ) : (
                <LineChart data={trendSeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 14 }} />
                  <YAxis tick={{ fontSize: 13 }} />
                  <Tooltip />
                  <Legend />
                  {years.map((y, i) => (
                    <Line key={y} type="monotone" dataKey={String(y)} name={String(y + 543)} stroke={YEAR_COLORS[i % YEAR_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
                  ))}
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Yearly bar chart */}
            <div className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h3 className="font-bold text-gray-900 text-xl">เปรียบเทียบ{config.countLabel}รายปี</h3>
                {ytdPct !== null && (
                  <span className={`inline-flex items-center gap-1 font-bold text-base px-3 py-1 rounded-full ${ytdPct >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {ytdPct >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                    {ytdPct >= 0 ? '+' : ''}{ytdPct.toFixed(1)}% เทียบปีก่อนหน้า (YTD)
                  </span>
                )}
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={yearly.map(y => ({ label: String(y.year + 543), value: y.count }))} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 14 }} />
                  <YAxis tick={{ fontSize: 13 }} />
                  <Tooltip />
                  <Bar dataKey="value" name={config.countLabel} radius={[4, 4, 0, 0]}>
                    {yearly.map((_, i) => <Cell key={i} fill={YEAR_COLORS[i % YEAR_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Category donut */}
            <div className="card p-4">
              <h3 className="font-bold text-gray-900 text-xl mb-2">การใช้งานจำแนกตาม{config.categoryLabel}</h3>
              <div className="flex items-center">
                <ResponsiveContainer width="60%" height={200}>
                  <PieChart>
                    <Pie data={categories} dataKey="count" nameKey="category" innerRadius={50} outerRadius={80}>
                      {categories.map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [`${Number(v).toLocaleString()} ครั้ง`]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {categories.map((c, i) => (
                    <div key={c.category} className="flex items-center justify-between text-base gap-2">
                      <span className="flex items-center gap-1.5 text-gray-700 truncate">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                        {categoryLabel(topic, c.category)}
                      </span>
                      <span className="font-bold text-gray-800 flex-shrink-0">{c.pct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Ranked table */}
          <div className="card overflow-hidden mb-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-xl">{config.groupLabel}ที่มีการใช้งานสูงสุด</h3>
              {config.linkTo && (
                <Link to={config.linkTo} className="text-navy-600 font-bold text-base hover:underline">{config.linkLabel}</Link>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="text-left text-base font-semibold text-gray-600 px-4 py-2.5">ลำดับ</th>
                    <th scope="col" className="text-left text-base font-semibold text-gray-600 px-4 py-2.5">{config.groupLabel}</th>
                    <th scope="col" className="text-right text-base font-semibold text-gray-600 px-4 py-2.5">{config.countLabel} (ครั้ง)</th>
                    <th scope="col" className="text-right text-base font-semibold text-gray-600 px-4 py-2.5">แนวโน้ม</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</td></tr>
                  ) : groups.slice(0, 10).map((g, i) => (
                    <tr key={g.group} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-700">{i + 1}</td>
                      <td className="px-4 py-2.5 font-bold text-gray-900">{g.group}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{g.count.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right">
                        {g.trendPct === null ? <span className="text-gray-400">-</span> : (
                          <span className={`inline-flex items-center gap-1 font-bold ${g.trendPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {g.trendPct >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                            {g.trendPct >= 0 ? '+' : ''}{g.trendPct.toFixed(1)}%
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Heatmap */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-xl">ช่วงเวลาที่มีการใช้งานสูงสุด</h3>
              <p className="text-base text-gray-400">{periodLabel(granularity, year, month, quarter)} — ประมาณการกระจายตามรูปแบบการใช้งานทั่วไป (ไม่ใช่ข้อมูลบันทึกเวลาระดับรายการจริง)</p>
            </div>
            <div className="overflow-x-auto p-4">
              <table className="w-full text-base border-separate" style={{ borderSpacing: 4 }}>
                <thead>
                  <tr>
                    <th className="text-left text-gray-500 font-semibold px-2">ช่วงเวลา</th>
                    {HEATMAP_HOUR_LABELS.map(h => <th key={h} className="text-center text-gray-500 font-semibold px-2">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {heatmap.map(row => (
                    <tr key={row.day}>
                      <td className="text-gray-700 font-bold px-2">{row.day}</td>
                      {row.cells.map((v, i) => {
                        const intensity = v / heatmapMax;
                        return (
                          <td key={i} className="text-center rounded-lg px-2 py-2 font-semibold"
                            style={{ backgroundColor: `rgba(27,58,107,${0.08 + intensity * 0.75})`, color: intensity > 0.55 ? '#fff' : '#1B3A6B' }}>
                            {v}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center gap-2 mt-3 text-base text-gray-500">
                <span>น้อย</span>
                <div className="flex-1 h-3 rounded-full" style={{ background: 'linear-gradient(to right, rgba(27,58,107,0.08), rgba(27,58,107,0.83))' }} />
                <span>มาก</span>
              </div>
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
