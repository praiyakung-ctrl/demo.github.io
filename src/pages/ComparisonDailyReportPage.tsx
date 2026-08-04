import { useMemo, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CalendarDays, Shield, AlertTriangle, Car } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Layout } from '../components/Layout';
import { ExportButtons } from '../components/ExportButtons';
import policeUsageData from '../data/comparisonPoliceUsage.json';
import cctvEventsData from '../data/comparisonCctvEvents.json';
import lprRoadsData from '../data/comparisonLprRoads.json';
import { EVENT_LABELS } from '../types';
import type { EventType } from '../types';
import { type UsageRecord, filterByPeriod, totalCount } from '../utils/comparisonStats';
import { distributeTotalAcrossDays } from '../utils/eventDrilldown';
import { exportChartWithTableToExcel, exportChartWithTableToPdf, todayStamp } from '../utils/exportReport';

type Topic = 'police' | 'events' | 'lpr';

function categoryLabel(topic: Topic, category: string): string {
  if (topic === 'events') return EVENT_LABELS[category as EventType] ?? category;
  return category;
}

const TOPIC_CONFIG: Record<Topic, { label: string; icon: React.ElementType; data: UsageRecord[]; countLabel: string }> = {
  police: { label: 'ตำรวจ Playback', icon: Shield, data: policeUsageData as UsageRecord[], countLabel: 'จำนวนการดู Playback' },
  events: { label: 'เหตุการณ์ CCTV', icon: AlertTriangle, data: cctvEventsData as UsageRecord[], countLabel: 'จำนวนเหตุการณ์' },
  lpr: { label: 'LPR รายจุดติดตั้ง', icon: Car, data: lprRoadsData as UsageRecord[], countLabel: 'จำนวนการอ่านป้ายทะเบียน' },
};

const MONTH_NAMES = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

export function ComparisonDailyReportPage() {
  const [searchParams] = useSearchParams();

  const topicParam = searchParams.get('topic');
  const topic: Topic = (topicParam === 'police' || topicParam === 'events' || topicParam === 'lpr') ? topicParam : 'police';
  const config = TOPIC_CONFIG[topic];
  const rows = config.data;

  const years = useMemo(() => [...new Set(rows.map(r => r.year))].sort(), [rows]);
  const initialYear = (() => {
    const fromQuery = Number(searchParams.get('year'));
    return years.includes(fromQuery) ? fromQuery : years[years.length - 1];
  })();

  const [year, setYear] = useState(initialYear);
  const monthsInYear = useMemo(() => [...new Set(rows.filter(r => r.year === year).map(r => r.month))].sort((a, b) => a - b), [rows, year]);
  const initialMonth = (() => {
    const fromQuery = Number(searchParams.get('month'));
    return monthsInYear.includes(fromQuery) ? fromQuery : (monthsInYear[monthsInYear.length - 1] ?? 1);
  })();
  const [month, setMonth] = useState(initialMonth);

  const group = searchParams.get('group') && searchParams.get('group') !== 'all' ? searchParams.get('group') : null;
  const category = searchParams.get('category') && searchParams.get('category') !== 'all' ? searchParams.get('category') : null;

  const [exporting, setExporting] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const scopedRows = rows.filter(r => (!group || r.group === group) && (!category || r.category === category));
  const filtered = filterByPeriod(scopedRows, 'month', year, month);
  const total = totalCount(filtered);

  const monthsAvailableForYear = [...new Set(rows.filter(r => r.year === year).map(r => r.month))].sort((a, b) => a - b);

  const dailyRows = useMemo(
    () => distributeTotalAcrossDays(total, month - 1, year + 543, year * 100 + month),
    [total, month, year]
  );

  const exportRows: (string | number)[][] = [
    ['วันที่', config.countLabel],
    ...dailyRows.map(row => [row.day, row.count]),
  ];

  const handleExport = async (format: 'pdf' | 'excel') => {
    const el = chartRef.current;
    if (!el || exporting) return;
    setExporting(true);
    try {
      const filename = `${config.label}-รายวัน-${MONTH_NAMES[month - 1]}-${todayStamp()}`;
      if (format === 'excel') {
        await exportChartWithTableToExcel(el, exportRows, `${MONTH_NAMES[month - 1]} ${year + 543}`, `${filename}.xlsx`);
      } else {
        await exportChartWithTableToPdf(el, exportRows, `${filename}.pdf`);
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <Layout>
      <div className="p-5 space-y-5 max-w-screen-xl mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-navy-700 rounded-xl flex items-center justify-center flex-shrink-0">
              <CalendarDays size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{config.label} — รายวัน</h1>
              <p className="text-lg text-gray-500">
                ข้อมูลรายวันของ {MONTH_NAMES[month - 1]} {year + 543}
                {group && ` • ${group}`}
                {category && ` • ${categoryLabel(topic, category)}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/reports/comparison" className="btn-secondary text-lg">กลับไปหน้าเปรียบเทียบ</Link>
            <ExportButtons disabled={exporting} onPdf={() => handleExport('pdf')} onExcel={() => handleExport('excel')} />
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label htmlFor="cd-year" className="label">ปี</label>
              <select
                id="cd-year"
                value={year}
                onChange={e => {
                  const y = Number(e.target.value);
                  setYear(y);
                  const monthsForY = [...new Set(rows.filter(r => r.year === y).map(r => r.month))].sort((a, b) => a - b);
                  if (!monthsForY.includes(month)) setMonth(monthsForY[monthsForY.length - 1] ?? 1);
                }}
                className="input-field w-auto"
              >
                {years.map(y => <option key={y} value={y}>{y + 543}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="cd-month" className="label">เดือน</label>
              <select id="cd-month" value={month} onChange={e => setMonth(Number(e.target.value))} className="input-field w-auto">
                {(monthsAvailableForYear.length > 0 ? monthsAvailableForYear : [1]).map(m => (
                  <option key={m} value={m}>{MONTH_NAMES[m - 1]} {year + 543}</option>
                ))}
              </select>
            </div>
            {(group || category) && (
              <p className="text-base text-gray-500">
                ตัวกรองที่สืบทอดมาจากหน้าเปรียบเทียบ: {group ?? 'ทุกกลุ่ม'} • {category ? categoryLabel(topic, category) : 'ทุกประเภท'} —
                หากต้องการเปลี่ยน กรุณากลับไปหน้าเปรียบเทียบ
              </p>
            )}
          </div>
        </div>

        {/* Chart + table */}
        <div ref={chartRef} className="card overflow-hidden p-0">
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-blue-50 border-b-2 border-blue-100">
            <div className="w-9 h-9 bg-navy-700 rounded-lg flex items-center justify-center flex-shrink-0">
              <CalendarDays size={20} className="text-white" />
            </div>
            <h3 className="font-extrabold text-navy-700 text-2xl">
              {config.countLabel}รายวัน — {MONTH_NAMES[month - 1]} {year + 543}
            </h3>
          </div>

          <div role="img" aria-label={`กราฟแท่ง${config.countLabel}รายวันของเดือน ${MONTH_NAMES[month - 1]} ${year + 543}`} className="p-4">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dailyRows} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 14 }} />
                <YAxis tick={{ fontSize: 14 }} />
                <Tooltip formatter={(v) => [`${v} ครั้ง`, config.countLabel]} labelFormatter={(l) => `วันที่ ${l}`} />
                <Bar dataKey="count" name={config.countLabel} fill="#1B3A6B" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="text-left text-base font-semibold text-gray-600 px-4 py-2.5">วันที่</th>
                  <th scope="col" className="text-right text-base font-semibold text-gray-600 px-4 py-2.5">{config.countLabel}</th>
                </tr>
              </thead>
              <tbody>
                {dailyRows.map(row => (
                  <tr key={row.day} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{row.day}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{row.count}</td>
                  </tr>
                ))}
                {dailyRows.length > 0 && (
                  <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                    <td className="px-4 py-2.5 text-gray-900">รวม</td>
                    <td className="px-4 py-2.5 text-right text-gray-900">{total}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
