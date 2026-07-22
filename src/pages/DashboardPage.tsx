import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, AlertTriangle, Users, Car, TrendingUp, CheckCircle, Crosshair, ParkingSquare, Waves, BarChart3, PieChart as PieChartIcon, Route, Table2, Bell, Shield } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import lprData from '../data/lpr.json';
import eventsData from '../data/events.json';
import camerasData from '../data/cameras.json';
import requestsData from '../data/requests.json';
import type { CctvEvent, MonthlyEventData, LprRoad, CitizenRequest, Camera as CameraType } from '../types';
import { EVENT_LABELS, EVENT_TEXT_COLORS } from '../types';
import { formatThaiDateTime } from '../utils/formatDate';
import { savedUsers } from '../utils/userStorage';
import { savedRequests } from '../utils/requestStorage';
import { policeUsageByStation } from '../utils/policeUsageStats';
import { ExportButtons } from '../components/ExportButtons';
import {
  exportChartWithTableToExcel, exportChartWithTableToPdf,
  exportElementToPdf, exportRowsToExcel, todayStamp,
} from '../utils/exportReport';

const events = eventsData as CctvEvent[];
const cameras = camerasData as CameraType[];
const requests = requestsData as CitizenRequest[];

const EVENT_TYPE_ICONS = {
  normal:  CheckCircle,
  traffic: Car,
  gunshot: Crosshair,
  parking: ParkingSquare,
  flood:   Waves,
  crowd:   Users,
} as const;

const EVENT_COLORS_MAP: Record<string, string> = {
  traffic: '#F97316',
  gunshot: '#EF4444',
  parking: '#92400E',
  flood: '#3B82F6',
  crowd: '#EAB308',
};

const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.'];

interface TooltipEntry { value: number; color: string; dataKey: string; name: string }

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ fontFamily: "'TH Sarabun New', sans-serif" }} className="bg-white border border-gray-200 rounded-xl shadow-xl p-3 min-w-[180px]">
      <p className="font-extrabold text-gray-700 text-xl mb-2">{label}</p>
      {[...payload].reverse().map(entry => {
        const Icon = EVENT_TYPE_ICONS[entry.dataKey as keyof typeof EVENT_TYPE_ICONS];
        return (
          <div key={entry.dataKey} className="flex items-center gap-2 text-lg py-0.5">
            {Icon && <Icon size={18} style={{ color: entry.color }} />}
            <span style={{ color: entry.color }} className="font-semibold">{entry.name} : {entry.value}</span>
          </div>
        );
      })}
    </div>
  );
}

function ChartLegend({ payload }: { payload?: { value: string; color: string; dataKey: string }[] }) {
  return (
    <div className="flex flex-wrap gap-3 justify-center mt-2">
      {payload?.map(entry => {
        const Icon = EVENT_TYPE_ICONS[entry.dataKey as keyof typeof EVENT_TYPE_ICONS];
        return (
          <div key={entry.dataKey} className="flex items-center gap-1 text-lg text-gray-600">
            {Icon && <Icon size={17} style={{ color: entry.color }} />}
            <span>{entry.value}</span>
          </div>
        );
      })}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, sub, gradient, iconBg }: {
  icon: React.ElementType; label: string; value: string | number; sub?: React.ReactNode;
  gradient: string; iconBg: string;
}) {
  return (
    <div className={`group rounded-2xl shadow-md p-5 flex flex-col gap-3 ${gradient} hover:shadow-xl transition-shadow duration-300`}>
      <div className="flex items-center justify-between">
        <p className="text-xl font-extrabold text-white leading-tight">{label}</p>
        <div className={`w-13 h-13 rounded-xl flex items-center justify-center ${iconBg} group-hover:scale-125 group-hover:rotate-12 transition-transform duration-300`}>
          <Icon size={26} className="text-white" />
        </div>
      </div>
      <p className="text-6xl font-extrabold text-white leading-none">{value}</p>
      {sub && <div className="text-lg font-semibold text-white">{sub}</div>}
    </div>
  );
}

/* Card section header: icon in a navy square on a light-blue strip */
function SectionHeader({ icon: Icon, title, action }: {
  icon: React.ElementType; title: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 -mx-4 -mt-4 mb-3 px-4 py-2.5 bg-blue-50 border-b-2 border-blue-100 rounded-t-xl">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 bg-navy-700 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon size={20} className="text-white" />
        </div>
        <h3 className="font-extrabold text-navy-700 text-2xl">{title}</h3>
      </div>
      {action}
    </div>
  );
}

export function DashboardPage() {
  useAuth();
  const [filterMonth, setFilterMonth] = useState('all');

  const onlineCount = cameras.filter(c => c.status === 'Online').length;
  const offlineCount = cameras.filter(c => c.status === 'Offline').length;
  const todayEvents = events.filter(e => e.timestamp.startsWith('2026-05-20'));
  const pendingRequests = requests.filter(r => ['ใหม่', 'รอดำเนินการ'].includes(r.status));
  const policeUsageTotal = policeUsageByStation(savedRequests(), savedUsers(), 'all', 'all')
    .reduce((sum, r) => sum + r.count, 0);

  const monthly = lprData.monthly as MonthlyEventData[];
  const roads = lprData.roads as LprRoad[];
  const daily = lprData.daily as { date: string; count: number }[];

  const todayLpr = daily[daily.length - 1]?.count ?? 0;

  const pieData = [
    { key: 'traffic', name: 'รถติด',    value: 380, color: EVENT_COLORS_MAP.traffic },
    { key: 'parking', name: 'จอดผิด',   value: 580, color: EVENT_COLORS_MAP.parking },
    { key: 'gunshot', name: 'เสียงปืน', value: 65,  color: EVENT_COLORS_MAP.gunshot },
    { key: 'flood',   name: 'น้ำท่วม',  value: 177, color: EVENT_COLORS_MAP.flood   },
    { key: 'crowd',   name: 'ชุมนุม',   value: 121, color: EVENT_COLORS_MAP.crowd   },
  ];

  const latestEvents = [...events]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);

  /* chart-box export: chart image + data table in a single PDF/Excel file */
  const monthlyChartRef = useRef<HTMLDivElement>(null);
  const pieChartRef = useRef<HTMLDivElement>(null);
  const lprChartRef = useRef<HTMLDivElement>(null);
  const trendChartRef = useRef<HTMLDivElement>(null);
  const summaryTableRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const monthlyRows: (string | number)[][] = [
    ['เดือน', 'รถติด', 'เสียงปืน', 'จอดผิด', 'น้ำท่วม', 'ชุมนุม', 'รวม'],
    ...monthly.map(r => [
      r.month, r.traffic, r.gunshot, r.parking, r.flood, r.crowd,
      r.traffic + r.gunshot + r.parking + r.flood + r.crowd,
    ]),
  ];
  const pieRows: (string | number)[][] = [
    ['ประเภทเหตุการณ์', 'จำนวน (ครั้ง)'],
    ...pieData.map(d => [d.name, d.value]),
  ];
  const lprRows: (string | number)[][] = [
    ['ถนน', 'จำนวน (คัน/วัน)'],
    ...roads.map(r => [r.road, r.count]),
  ];
  const dailyRows: (string | number)[][] = [
    ['วันที่', 'จำนวน'],
    ...daily.map(d => [d.date, d.count]),
  ];

  const exportChart = async (
    ref: React.RefObject<HTMLDivElement | null>,
    rows: (string | number)[][],
    name: string,
    format: 'pdf' | 'excel'
  ) => {
    const el = ref.current;
    if (!el || exporting) return;
    setExporting(true);
    try {
      const filename = `${name}-${todayStamp()}`;
      if (format === 'excel') {
        await exportChartWithTableToExcel(el, rows, name, `${filename}.xlsx`);
      } else {
        await exportChartWithTableToPdf(el, rows, `${filename}.pdf`);
      }
    } finally {
      setExporting(false);
    }
  };

  const exportSummary = async (format: 'pdf' | 'excel') => {
    if (exporting) return;
    setExporting(true);
    try {
      const filename = `สรุปเหตุการณ์รายเดือน-${todayStamp()}`;
      if (format === 'excel') {
        await exportRowsToExcel(monthlyRows, 'สรุปรายเดือน', `${filename}.xlsx`);
      } else if (summaryTableRef.current) {
        await exportElementToPdf(summaryTableRef.current, `${filename}.pdf`);
      }
    } finally {
      setExporting(false);
    }
  };

  const CustomPieLabel = (props: PieLabelRenderProps) => {
    const cx = Number(props.cx ?? 0);
    const cy = Number(props.cy ?? 0);
    const midAngle = Number(props.midAngle ?? 0);
    const innerRadius = Number(props.innerRadius ?? 0);
    const outerRadius = Number(props.outerRadius ?? 0);
    const percent = Number(props.percent ?? 0);
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={17} fontWeight="bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Layout>
      <div className="p-4 space-y-4 max-w-screen-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Dashboard ภาพรวมระบบ</h1>
            <p className="text-xl text-gray-500">ข้อมูลกล้อง CCTV และเหตุการณ์จังหวัดชลบุรี</p>
          </div>
          <div className="flex gap-2">
            <select
              aria-label="เลือกเดือน"
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              className="input-field py-2 text-lg w-44"
            >
              <option value="all">ทุกเดือน</option>
              {MONTHS.map((m, i) => <option key={i} value={String(i + 1)}>{m} 2568</option>)}
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            icon={Camera}
            label="กล้องทั้งหมด"
            value={cameras.length}
            gradient="bg-gradient-to-br from-blue-500 to-blue-700"
            iconBg="bg-white/20"
            sub={<>
              <span className="font-semibold text-white">{onlineCount} Online</span>
              <span className="mx-1 text-white/50">·</span>
              <span className="text-white/70">{offlineCount} Offline</span>
            </>}
          />
          <SummaryCard
            icon={AlertTriangle}
            label="เหตุการณ์วันนี้"
            value={todayEvents.length}
            gradient="bg-gradient-to-br from-orange-400 to-red-600"
            iconBg="bg-white/20"
            sub={
              <div className="flex flex-wrap gap-1">
                {(['traffic', 'gunshot', 'parking', 'flood', 'crowd'] as const).map(type => {
                  const cnt = todayEvents.filter(e => e.eventType === type).length;
                  if (!cnt) return null;
                  return (
                    <span key={type} className="inline-flex items-center text-white text-base px-2 py-0.5 rounded-full font-semibold bg-white/25">
                      {cnt}
                    </span>
                  );
                })}
              </div>
            }
          />
          <SummaryCard
            icon={Users}
            label="คำขอรอดำเนินการ"
            value={pendingRequests.length}
            gradient="bg-gradient-to-br from-amber-600 to-orange-800"
            iconBg="bg-white/20"
            sub={<span className="font-semibold text-white">รอตรวจสอบ</span>}
          />
          <SummaryCard
            icon={Car}
            label="LPR อ่านทะเบียนวันนี้"
            value={todayLpr.toLocaleString()}
            gradient="bg-gradient-to-br from-emerald-500 to-green-700"
            iconBg="bg-white/20"
            sub={<span className="flex items-center gap-1 font-semibold text-white"><TrendingUp size={13} /> +5.2% จากเมื่อวาน</span>}
          />
        </div>

        {/* Entry point: police usage KPI report */}
        <div className="card flex flex-wrap items-center justify-between gap-3 bg-navy-700 text-white">
          <div className="flex items-center gap-3">
            <Shield size={28} className="flex-shrink-0" />
            <div>
              <h3 className="font-bold text-xl text-white">สถิติการเข้าใช้งานของตำรวจ (KPI)</h3>
              <p className="text-lg text-blue-100">รวมคำขอดู Playback CCTV จากเจ้าหน้าที่ตำรวจทุกสถานี: {policeUsageTotal.toLocaleString()} ครั้ง</p>
            </div>
          </div>
          <Link to="/reports/police-usage" className="bg-white text-navy-700 font-bold text-lg px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap">
            ดูรายงานฉบับเต็ม
          </Link>
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div ref={monthlyChartRef} className="card p-4 lg:col-span-3">
            <SectionHeader
              icon={BarChart3}
              title="เหตุการณ์ CCTV รายเดือน (ม.ค.–มิ.ย. 2568)"
              action={<ExportButtons disabled={exporting} onPdf={() => exportChart(monthlyChartRef, monthlyRows, 'เหตุการณ์รายเดือน', 'pdf')} onExcel={() => exportChart(monthlyChartRef, monthlyRows, 'เหตุการณ์รายเดือน', 'excel')} />}
            />
            <div role="img" aria-label="กราฟแท่งเหตุการณ์ CCTV รายเดือน แยกตามประเภท ข้อมูลเดียวกับตารางสรุปเหตุการณ์รายเดือนด้านล่าง">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 18 }} />
                <YAxis tick={{ fontSize: 17 }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend content={<ChartLegend />} />
                <Bar dataKey="traffic" name="รถติด" stackId="a" fill={EVENT_COLORS_MAP.traffic} />
                <Bar dataKey="gunshot" name="เสียงปืน" stackId="a" fill={EVENT_COLORS_MAP.gunshot} />
                <Bar dataKey="parking" name="จอดผิด" stackId="a" fill={EVENT_COLORS_MAP.parking} />
                <Bar dataKey="flood" name="น้ำท่วม" stackId="a" fill={EVENT_COLORS_MAP.flood} />
                <Bar dataKey="crowd" name="ชุมนุม" stackId="a" fill={EVENT_COLORS_MAP.crowd} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            </div>
          </div>

          <div ref={pieChartRef} className="card p-4 lg:col-span-2">
            <SectionHeader
              icon={PieChartIcon}
              title="สัดส่วนเหตุการณ์ทั้งหมด"
              action={<ExportButtons disabled={exporting} onPdf={() => exportChart(pieChartRef, pieRows, 'สัดส่วนเหตุการณ์', 'pdf')} onExcel={() => exportChart(pieChartRef, pieRows, 'สัดส่วนเหตุการณ์', 'excel')} />}
            />
            <div role="img" aria-label={`กราฟวงกลมสัดส่วนเหตุการณ์ทั้งหมด: ${pieData.map(d => `${d.name} ${d.value} ครั้ง`).join(', ')}`}>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" labelLine={false} label={CustomPieLabel}>
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${v} ครั้ง`]} />
              </PieChart>
            </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {pieData.map(d => {
                const Icon = EVENT_TYPE_ICONS[d.key as keyof typeof EVENT_TYPE_ICONS];
                return (
                  <div key={d.name} className="flex items-center gap-1 text-lg text-gray-600">
                    {Icon && <Icon size={18} style={{ color: d.color }} />}
                    <span>{d.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div ref={lprChartRef} className="card p-4">
            <SectionHeader
              icon={Route}
              title="LPR แยกตามจุดติดตั้ง (คัน/วัน)"
              action={<ExportButtons disabled={exporting} onPdf={() => exportChart(lprChartRef, lprRows, 'LPR-จุดติดตั้ง', 'pdf')} onExcel={() => exportChart(lprChartRef, lprRows, 'LPR จุดติดตั้ง', 'excel')} />}
            />
            <div role="img" aria-label={`กราฟแท่งแนวนอน LPR แยกตามจุดติดตั้ง: ${roads.slice(0, 3).map(r => `${r.road} ${r.count.toLocaleString()} คันต่อวัน`).join(', ')} และอื่น ๆ`}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={roads} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 16 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="road" tick={{ fontSize: 16 }} width={140} />
                <Tooltip formatter={(v) => [`${Number(v).toLocaleString()} คัน`]} />
                <Bar dataKey="count" fill="#2563EB" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
            </div>
          </div>

          <div ref={trendChartRef} className="card p-4">
            <SectionHeader
              icon={TrendingUp}
              title="แนวโน้มเหตุการณ์ 7 วันล่าสุด"
              action={<ExportButtons disabled={exporting} onPdf={() => exportChart(trendChartRef, dailyRows, 'แนวโน้ม-7-วัน', 'pdf')} onExcel={() => exportChart(trendChartRef, dailyRows, 'แนวโน้ม 7 วัน', 'excel')} />}
            />
            <div role="img" aria-label={`กราฟเส้นแนวโน้ม 7 วันล่าสุด: ${daily.map(d => `${d.date} ${d.count.toLocaleString()}`).join(', ')}`}>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={daily} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 16 }} />
                <YAxis tick={{ fontSize: 16 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" name="จำนวนรถ" stroke="#2563EB" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Table + latest events */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div ref={summaryTableRef} className="card p-4 lg:col-span-3">
            <SectionHeader
              icon={Table2}
              title="สรุปเหตุการณ์รายเดือน"
              action={<ExportButtons disabled={exporting} onPdf={() => exportSummary('pdf')} onExcel={() => exportSummary('excel')} />}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-xl">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th scope="col" className="text-left text-xl text-gray-600 pb-2 font-semibold">เดือน</th>
                    <th scope="col" className="text-right text-xl pb-2 font-semibold" style={{ color: EVENT_TEXT_COLORS.traffic }}>รถติด</th>
                    <th scope="col" className="text-right text-xl pb-2 font-semibold" style={{ color: EVENT_TEXT_COLORS.gunshot }}>ปืน</th>
                    <th scope="col" className="text-right text-xl pb-2 font-semibold" style={{ color: EVENT_TEXT_COLORS.parking }}>จอดผิด</th>
                    <th scope="col" className="text-right text-xl pb-2 font-semibold" style={{ color: EVENT_TEXT_COLORS.flood }}>น้ำท่วม</th>
                    <th scope="col" className="text-right text-xl pb-2 font-semibold" style={{ color: EVENT_TEXT_COLORS.crowd }}>ชุมนุม</th>
                    <th scope="col" className="text-right text-xl text-gray-600 pb-2 font-semibold">รวม</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.map(row => (
                    <tr key={row.month} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 font-medium text-gray-900">{row.month}</td>
                      <td className="py-2 text-right text-gray-700">{row.traffic}</td>
                      <td className="py-2 text-right text-gray-700">{row.gunshot}</td>
                      <td className="py-2 text-right text-gray-700">{row.parking}</td>
                      <td className="py-2 text-right text-gray-700">{row.flood}</td>
                      <td className="py-2 text-right text-gray-700">{row.crowd}</td>
                      <td className="py-2 text-right font-bold text-gray-900">
                        {row.traffic + row.gunshot + row.parking + row.flood + row.crowd}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card p-4 lg:col-span-2">
            <SectionHeader icon={Bell} title="เหตุการณ์ล่าสุด" />
            <div className="space-y-2">
              {latestEvents.map(ev => {
                const EvIcon = EVENT_TYPE_ICONS[ev.eventType] ?? AlertTriangle;
                const isActive = !ev.isAcknowledged && ev.eventType !== 'normal';
                return (
                  <div key={ev.id} className="flex items-start gap-2 py-2 border-b border-gray-50 last:border-0">
                    <EvIcon
                      size={22}
                      className={`mt-0.5 flex-shrink-0 ${isActive ? 'animate-blink' : ''}`}
                      style={{ color: EVENT_COLORS_MAP[ev.eventType] ?? '#9CA3AF' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xl font-bold" style={{ color: EVENT_TEXT_COLORS[ev.eventType] ?? '#374151' }}>
                        {ev.cameraId} : {ev.cameraName} - {EVENT_LABELS[ev.eventType]}
                      </p>
                      <p className="text-lg text-navy-700">{formatThaiDateTime(ev.timestamp)}</p>
                    </div>
                    {ev.isAcknowledged && <CheckCircle size={20} className="text-green-500 flex-shrink-0 mt-0.5" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
