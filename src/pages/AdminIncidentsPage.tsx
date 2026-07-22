import { useState } from 'react';
import { CheckCircle2, MapPin, ShieldAlert, XCircle } from 'lucide-react';
import { Layout } from '../components/Layout';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/Badge';
import { savedIncidentPoints, updateIncidentPoint } from '../utils/incidentPoints';
import type { IncidentPoint } from '../types';
import { formatThaiDateTime } from '../utils/formatDate';
import { Pagination } from '../components/Pagination';
import { useAuth } from '../context/AuthContext';
import { logAudit } from '../utils/auditLog';

const PAGE_SIZE = 10;
const STATUS_LABEL: Record<IncidentPoint['status'], string> = {
  pending: 'รอตรวจสอบ', approved: 'อนุมัติ', rejected: 'ปฏิเสธ',
};
const TYPE_LABEL: Record<IncidentPoint['type'], string> = {
  risk: 'จุดเสี่ยงภัย', proposed: 'จุดขอติดตั้งใหม่',
};

function RejectModal({ isOpen, onClose, onConfirm }: { isOpen: boolean; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  const close = () => { setReason(''); onClose(); };
  return (
    <Modal isOpen={isOpen} onClose={close} title="ปฏิเสธจุดแจ้งเหตุ" icon={<XCircle size={20} className="text-white" />}>
      <div className="space-y-4">
        <label htmlFor="incident-reject-reason" className="label">เหตุผลที่ปฏิเสธ <span className="text-red-500">*</span></label>
        <textarea
          id="incident-reject-reason"
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={3}
          placeholder="เช่น ตรวจสอบพื้นที่แล้วไม่พบความเสี่ยงตามที่แจ้ง"
          className="input-field resize-none"
        />
        <div className="flex gap-3 justify-end">
          <button onClick={close} className="btn-secondary">ยกเลิก</button>
          <button
            onClick={() => { onConfirm(reason.trim()); setReason(''); }}
            disabled={!reason.trim()}
            className="btn-danger disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ปฏิเสธ
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function AdminIncidentsPage() {
  const { user, can } = useAuth();
  const [points, setPoints] = useState<IncidentPoint[]>(() =>
    [...savedIncidentPoints()].sort((a, b) => (a.status === b.status ? b.submittedAt.localeCompare(a.submittedAt) : a.status === 'pending' ? -1 : 1))
  );
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const pendingCount = points.filter(p => p.status === 'pending').length;
  const totalPages = Math.max(1, Math.ceil(points.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = points.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const refresh = () => setPoints([...savedIncidentPoints()].sort((a, b) => (a.status === b.status ? b.submittedAt.localeCompare(a.submittedAt) : a.status === 'pending' ? -1 : 1)));

  const handleApprove = (id: string) => {
    const now = new Date().toISOString();
    updateIncidentPoint(id, { status: 'approved', reviewedBy: user?.name, reviewedAt: now });
    logAudit(user, 'edit', 'ตรวจสอบจุดแจ้งเหตุ', `อนุมัติจุดแจ้งเหตุ ${id}`);
    refresh();
  };

  const handleReject = (reason: string) => {
    if (!rejectId || !reason) return;
    const now = new Date().toISOString();
    updateIncidentPoint(rejectId, { status: 'rejected', rejectionReason: reason, reviewedBy: user?.name, reviewedAt: now });
    logAudit(user, 'edit', 'ตรวจสอบจุดแจ้งเหตุ', `ปฏิเสธจุดแจ้งเหตุ ${rejectId}: ${reason}`);
    setRejectId(null);
    refresh();
  };

  return (
    <Layout>
      <div className="flex flex-col h-full">
        <div className="bg-blue-50 border-b-2 border-blue-100 px-6 py-4 flex items-center justify-between shadow-sm flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-navy-700 rounded-xl flex items-center justify-center">
              <ShieldAlert size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-navy-700">ตรวจสอบจุดแจ้งเหตุ</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm text-gray-600">จุดเสี่ยงภัย/จุดขอติดตั้งกล้องใหม่ ที่ตำรวจและเจ้าหน้าที่ท้องถิ่นปักหมุด</span>
                <span className="bg-amber-400 text-navy-900 text-sm font-bold px-2.5 py-0.5 rounded-full">
                  รอตรวจสอบ {pendingCount} รายการ
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5">
          <div className="card overflow-hidden shadow-md">
            {points.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-gray-400">
                <CheckCircle2 size={48} className="text-green-400 mb-3" />
                <p className="text-xl font-semibold text-gray-500">ไม่มีจุดแจ้งเหตุรอตรวจสอบ</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xl">
                  <thead className="bg-blue-200">
                    <tr>
                      <th scope="col" className="text-left text-xl font-semibold text-navy-700 px-4 py-2.5">ประเภท</th>
                      <th scope="col" className="text-left text-xl font-semibold text-navy-700 px-4 py-2.5">ตำแหน่ง</th>
                      <th scope="col" className="text-left text-xl font-semibold text-navy-700 px-4 py-2.5">ประเภทเหตุการณ์</th>
                      <th scope="col" className="text-left text-xl font-semibold text-navy-700 px-4 py-2.5">ผู้แจ้ง</th>
                      <th scope="col" className="text-left text-xl font-semibold text-navy-700 px-4 py-2.5">วันเวลาแจ้ง</th>
                      <th scope="col" className="text-center text-xl font-semibold text-navy-700 px-4 py-2.5">สถานะ</th>
                      <th scope="col" className="text-center text-xl font-semibold text-navy-700 px-4 py-2.5">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map(p => (
                      <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-2.5">
                          <span className={`text-sm font-bold px-2.5 py-1 rounded-lg border ${
                            p.type === 'risk' ? 'bg-red-100 text-red-700 border-red-300' : 'bg-yellow-100 text-yellow-700 border-yellow-300'
                          }`}>
                            {TYPE_LABEL[p.type]}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-700">
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin size={16} className="text-navy-400 flex-shrink-0" />
                            {p.locationLabel}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-700">{p.category}</td>
                        <td className="px-4 py-2.5 text-gray-700">{p.submittedBy}</td>
                        <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{formatThaiDateTime(p.submittedAt)}</td>
                        <td className="px-4 py-2.5 text-center"><StatusBadge status={STATUS_LABEL[p.status]} /></td>
                        <td className="px-4 py-2.5 text-center">
                          {p.status === 'pending' && can('adminIncidents', 'edit') && (
                            <div className="flex gap-2 justify-center">
                              <button onClick={() => handleApprove(p.id)} className="btn-primary text-base py-1.5 px-4">อนุมัติ</button>
                              <button onClick={() => setRejectId(p.id)} className="btn-danger text-base py-1.5 px-4">ปฏิเสธ</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination total={points.length} page={safePage} pageSize={PAGE_SIZE} onPageChange={setPage} />
              </div>
            )}
          </div>
        </div>
      </div>

      <RejectModal isOpen={rejectId !== null} onClose={() => setRejectId(null)} onConfirm={handleReject} />
    </Layout>
  );
}
