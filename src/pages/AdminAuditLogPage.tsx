import { useRef, useState } from 'react';
import { ScrollText, Search } from 'lucide-react';
import { Layout } from '../components/Layout';
import { Pagination } from '../components/Pagination';
import { ExportButtons } from '../components/ExportButtons';
import { savedAuditLogs, AUDIT_ACTION_LABELS } from '../utils/auditLog';
import type { AuditAction } from '../utils/auditLog';
import { formatThaiDateTime } from '../utils/formatDate';
import { exportElementToPdf, exportRowsToExcel, todayStamp } from '../utils/exportReport';

const PAGE_SIZE = 10;

const ACTION_BADGE: Record<AuditAction, string> = {
  login: 'bg-green-100 text-green-700',
  logout: 'bg-gray-100 text-gray-600',
  create: 'bg-blue-100 text-blue-700',
  edit: 'bg-amber-100 text-amber-700',
  delete: 'bg-red-100 text-red-700',
  export: 'bg-purple-100 text-purple-700',
  download: 'bg-teal-100 text-teal-700',
};

export function AdminAuditLogPage() {
  const [logs] = useState(() =>
    [...savedAuditLogs()].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  );
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const filtered = logs.filter(log =>
    (log.name.toLowerCase().includes(search.toLowerCase()) ||
      log.username.toLowerCase().includes(search.toLowerCase()) ||
      log.detail.toLowerCase().includes(search.toLowerCase()) ||
      log.menu.toLowerCase().includes(search.toLowerCase())) &&
    (filterAction === 'all' || log.action === filterAction)
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const exportRows: (string | number)[][] = [
    ['วันเวลา', 'ผู้ใช้', 'Username', 'การกระทำ', 'เมนู', 'รายละเอียด'],
    ...filtered.map(log => [
      formatThaiDateTime(log.timestamp), log.name, log.username,
      AUDIT_ACTION_LABELS[log.action], log.menu, log.detail,
    ]),
  ];

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (exporting) return;
    setExporting(true);
    try {
      const filename = `ประวัติการใช้งานระบบ-${todayStamp()}`;
      if (format === 'excel') {
        await exportRowsToExcel(exportRows, 'Audit Log', `${filename}.xlsx`);
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
              <ScrollText size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-navy-700">ประวัติการใช้งานระบบ</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm text-gray-600">บันทึกการเข้าใช้และการเปลี่ยนแปลงข้อมูลทั้งหมด</span>
                <span className="bg-navy-700 text-white text-sm font-bold px-2.5 py-0.5 rounded-full">{logs.length} รายการ</span>
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
                  placeholder="ค้นหาผู้ใช้, เมนู, หรือรายละเอียด..."
                  aria-label="ค้นหาผู้ใช้ เมนู หรือรายละเอียด"
                  className="w-full pl-9 pr-3 py-2 text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:border-navy-400 bg-white"
                />
              </div>
              <select
                aria-label="กรองตามการกระทำ"
                value={filterAction}
                onChange={e => { setFilterAction(e.target.value); setPage(1); }}
                className="input-field w-auto py-2 text-base"
              >
                <option value="all">ทุกการกระทำ</option>
                {Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <span className="text-base text-navy-700 font-bold flex-shrink-0">
                พบ {filtered.length} / {logs.length} รายการ
              </span>
              <div className="ml-auto flex-shrink-0">
                <ExportButtons disabled={exporting} onPdf={() => handleExport('pdf')} onExcel={() => handleExport('excel')} />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xl">
                <thead>
                  <tr className="bg-blue-200">
                    {['วันเวลา', 'ผู้ใช้', 'การกระทำ', 'เมนู', 'รายละเอียด'].map(h => (
                      <th key={h} scope="col" className="text-left text-xl font-bold text-navy-700 px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((log, idx) => (
                    <tr key={log.id} className={`border-b border-blue-100 hover:bg-blue-100 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-blue-50'}`}>
                      <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{formatThaiDateTime(log.timestamp)}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-bold text-navy-700">{log.name}</p>
                        <p className="text-sm text-gray-500 font-mono">{log.username}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center text-sm font-bold px-3 py-1 rounded-lg ${ACTION_BADGE[log.action]}`}>
                          {AUDIT_ACTION_LABELS[log.action]}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-700">{log.menu}</td>
                      <td className="px-4 py-2.5 text-gray-700">{log.detail}</td>
                    </tr>
                  ))}
                  {pageRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-gray-400 text-lg">ไม่พบรายการที่ตรงกับเงื่อนไข</td>
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
