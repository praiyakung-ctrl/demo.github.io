import { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarDays, Car, Crosshair, ParkingSquare, Waves, Users } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Layout } from '../components/Layout';
import { ExportButtons } from '../components/ExportButtons';
import lprData from '../data/lpr.json';
import type { MonthlyEventData } from '../types';
import { EVENT_LABELS, EVENT_COLORS } from '../types';
import { dailyBreakdownForMonth, EVENT_CATEGORY_KEYS } from '../utils/eventDrilldown';
import type { DailyEventRow, EventCategoryKey } from '../utils/eventDrilldown';
import { exportChartWithTableToExcel, exportChartWithTableToPdf, todayStamp } from '../utils/exportReport';

const monthly = lprData.monthly as MonthlyEventData[];
const YEAR_BE = 2568;

function isoDate(monthIndex: number, day: number): string {
  const d = new Date(YEAR_BE - 543, monthIndex, day);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const EVENT_TYPE_ICONS: Record<EventCategoryKey, React.ElementType> = {
  traffic: Car,
  gunshot: Crosshair,
  parking: ParkingSquare,
  flood: Waves,
  crowd: Users,
};

interface TooltipEntry { value: number; color: string; dataKey: string; name: string }

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 min-w-[160px]">
      <p className="text-base font-bold text-navy-700 mb-2">วันที่ {label}</p>
      {[...payload].reverse().map(entry => {
        const Icon = EVENT_TYPE_ICONS[entry.dataKey as EventCategoryKey];
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
        const Icon = EVENT_TYPE_ICONS[entry.dataKey as EventCategoryKey];
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

export function DailyEventsReportPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialMonth = (() => {
    const fromQuery = Number(searchParams.get('month'));
    return fromQuery >= 1 && fromQuery <= monthly.length ? fromQuery : 1;
  })();
  const initialCategories = (() => {
    const fromQuery = searchParams.get('category');
    return fromQuery && (EVENT_CATEGORY_KEYS as readonly string[]).includes(fromQuery)
      ? new Set([fromQuery])
      : new Set<string>(EVENT_CATEGORY_KEYS);
  })();

  const [month, setMonth] = useState(initialMonth);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(initialCategories);
  const [exporting, setExporting] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const handleDrilldown = (day: number, key: EventCategoryKey) => {
    navigate(`/reports/events?day=${isoDate(monthIndex, day)}&eventType=${key}`);
  };

  const toggleCategory = (key: string) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const monthIndex = month - 1;
  const monthRow = monthly[monthIndex];
  const activeCategories = EVENT_CATEGORY_KEYS.filter(k => selectedCategories.has(k));

  const dailyRows = monthRow ? dailyBreakdownForMonth(monthIndex, monthRow, YEAR_BE) : [];

  const totalByCategory = (key: EventCategoryKey) => dailyRows.reduce((s, r) => s + r[key], 0);
  const grandTotal = activeCategories.reduce((s, k) => s + totalByCategory(k), 0);

  const exportRows: (string | number)[][] = [
    ['วันที่', ...activeCategories.map(k => EVENT_LABELS[k]), 'รวม'],
    ...dailyRows.map(row => [
      row.day,
      ...activeCategories.map(k => row[k]),
      activeCategories.reduce((s, k) => s + row[k], 0),
    ]),
  ];

  const handleExport = async (format: 'pdf' | 'excel') => {
    const el = chartRef.current;
    if (!el || exporting || !monthRow) return;
    setExporting(true);
    try {
      const filename = `เหตุการณ์รายวัน-${monthRow.month}-${todayStamp()}`;
      if (format === 'excel') {
        await exportChartWithTableToExcel(el, exportRows, `${monthRow.month} ${YEAR_BE}`, `${filename}.xlsx`);
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
              <h1 className="text-3xl font-bold text-gray-900">เหตุการณ์ CCTV รายวัน</h1>
              <p className="text-lg text-gray-500">
                {monthRow ? `ข้อมูลรายวันของ ${monthRow.month} ${YEAR_BE}` : 'ไม่พบข้อมูลของเดือนที่เลือก'}
              </p>
            </div>
          </div>
          <ExportButtons disabled={exporting || !monthRow} onPdf={() => handleExport('pdf')} onExcel={() => handleExport('excel')} />
        </div>

        {/* Filters */}
        <div className="card p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label htmlFor="de-month" className="label">เดือน</label>
              <select
                id="de-month"
                value={month}
                onChange={e => setMonth(Number(e.target.value))}
                className="input-field w-auto"
              >
                {monthly.map((m, i) => <option key={m.month} value={i + 1}>{m.month} {YEAR_BE}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 flex-wrap flex-1">
              <span className="text-lg font-bold text-gray-900 whitespace-nowrap flex-shrink-0">ประเภทเหตุการณ์:</span>
              <button
                onClick={() => setSelectedCategories(new Set(EVENT_CATEGORY_KEYS))}
                className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg border-2 font-bold text-sm shadow-sm transition-all flex-shrink-0 ${
                  selectedCategories.size === EVENT_CATEGORY_KEYS.length
                    ? 'bg-navy-700 text-white border-navy-700'
                    : 'bg-white text-navy-700 border-navy-300 hover:bg-navy-50'
                }`}
              >
                ทั้งหมด
              </button>
              {EVENT_CATEGORY_KEYS.map(key => {
                const Icon = EVENT_TYPE_ICONS[key];
                const active = selectedCategories.has(key);
                return (
                  <button
                    key={key}
                    onClick={() => toggleCategory(key)}
                    className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg border-2 font-bold text-sm shadow-sm transition-all flex-shrink-0 ${
                      active ? 'text-white shadow-md' : 'bg-white text-navy-700 hover:brightness-95'
                    }`}
                    style={active
                      ? { backgroundColor: EVENT_COLORS[key], borderColor: EVENT_COLORS[key] }
                      : { borderColor: EVENT_COLORS[key] }}
                  >
                    <Icon size={14} className="flex-shrink-0" style={{ color: active ? 'white' : EVENT_COLORS[key] }} />
                    {EVENT_LABELS[key]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Chart + table */}
        <div ref={chartRef} className="card overflow-hidden p-0">
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-blue-50 border-b-2 border-blue-100">
            <div className="w-9 h-9 bg-navy-700 rounded-lg flex items-center justify-center flex-shrink-0">
              <CalendarDays size={20} className="text-white" />
            </div>
            <h3 className="font-extrabold text-navy-700 text-2xl">
              เหตุการณ์รายวัน — {monthRow ? `${monthRow.month} ${YEAR_BE}` : '-'}
            </h3>
          </div>

          {monthRow && (
            <div role="img" aria-label={`กราฟแท่งเหตุการณ์ CCTV รายวันของเดือน ${monthRow.month} ${YEAR_BE} แยกตามประเภท`} className="p-4">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dailyRows} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 14 }} />
                  <YAxis tick={{ fontSize: 14 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend content={<ChartLegend />} />
                  {activeCategories.map(key => (
                    <Bar
                      key={key}
                      dataKey={key}
                      name={EVENT_LABELS[key]}
                      stackId="a"
                      fill={EVENT_COLORS[key]}
                      cursor="pointer"
                      onClick={(item: { payload?: DailyEventRow }) => { if (item.payload && item.payload[key] > 0) handleDrilldown(item.payload.day, key); }}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="text-left text-base font-semibold text-gray-600 px-4 py-2.5">วันที่</th>
                  {activeCategories.map(key => (
                    <th key={key} scope="col" className="text-right text-base font-semibold px-4 py-2.5" style={{ color: EVENT_COLORS[key] }}>
                      {EVENT_LABELS[key]}
                    </th>
                  ))}
                  <th scope="col" className="text-right text-base font-semibold text-gray-600 px-4 py-2.5">รวม</th>
                </tr>
              </thead>
              <tbody>
                {dailyRows.map(row => {
                  const total = activeCategories.reduce((s, k) => s + row[k], 0);
                  return (
                    <tr key={row.day} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-900">{row.day}</td>
                      {activeCategories.map(key => (
                        <td key={key} className="px-4 py-2.5 text-right text-gray-700">
                          {row[key] > 0 ? (
                            <button
                              onClick={() => handleDrilldown(row.day, key)}
                              className="hover:underline hover:text-navy-700 font-medium"
                              title={`ดูรายการ${EVENT_LABELS[key]}วันที่ ${row.day}`}
                            >
                              {row[key]}
                            </button>
                          ) : row[key]}
                        </td>
                      ))}
                      <td className="px-4 py-2.5 text-right font-bold text-gray-900">{total}</td>
                    </tr>
                  );
                })}
                {dailyRows.length > 0 && (
                  <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                    <td className="px-4 py-2.5 text-gray-900">รวม</td>
                    {activeCategories.map(key => (
                      <td key={key} className="px-4 py-2.5 text-right" style={{ color: EVENT_COLORS[key] }}>
                        {totalByCategory(key)}
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-right text-gray-900">{grandTotal}</td>
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
