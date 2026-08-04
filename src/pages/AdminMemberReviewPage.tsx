import { useState } from 'react';
import { CheckCircle2, Eye, Search, UserCheck, XCircle } from 'lucide-react';
import { Layout } from '../components/Layout';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/Badge';
import { Pagination } from '../components/Pagination';
import { useAuth } from '../context/AuthContext';
import { logAudit } from '../utils/auditLog';
import { ensureDemoPendingMembers, savedMembers, updateMember } from '../utils/memberStorage';
import { sendApprovalEmail, sendRejectionEmail } from '../utils/emailApi';
import { formatThaiDateTime } from '../utils/formatDate';
import { MEMBER_STATUS_LABEL } from '../types';
import type { CitizenMember, MemberStatus } from '../types';

const PAGE_SIZE = 10;

function sortMembers(members: CitizenMember[]): CitizenMember[] {
  return [...members].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'pending' ? -1 : b.status === 'pending' ? 1 : 0;
    return b.registeredAt.localeCompare(a.registeredAt);
  });
}

function RejectModal({ isOpen, onClose, onConfirm }: { isOpen: boolean; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  const close = () => { setReason(''); onClose(); };
  return (
    <Modal isOpen={isOpen} onClose={close} title="ปฏิเสธใบสมัครสมาชิก" icon={<XCircle size={20} className="text-white" />}>
      <div className="space-y-4">
        <label htmlFor="member-reject-reason" className="label">เหตุผลที่ปฏิเสธ <span className="text-red-500">*</span></label>
        <textarea
          id="member-reject-reason"
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={3}
          placeholder="เช่น ภาพสแกนหนังสือเดินทางไม่ชัดเจน กรุณาแนบใหม่"
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-500">{label}</p>
      <p className="text-lg text-gray-900">{value || '-'}</p>
    </div>
  );
}

export function AdminMemberReviewPage() {
  const { user, can } = useAuth();
  const [members, setMembers] = useState<CitizenMember[]>(() => {
    ensureDemoPendingMembers();
    return sortMembers(savedMembers());
  });
  const [statusFilter, setStatusFilter] = useState<MemberStatus | 'all'>('pending');
  const [search, setSearch] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const refresh = () => setMembers(sortMembers(savedMembers()));

  const pendingCount = members.filter(m => m.status === 'pending').length;

  const filtered = members.filter(m => {
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const detailMember = members.find(m => m.id === detailId) ?? null;

  const handleApprove = (id: string) => {
    const member = members.find(m => m.id === id);
    if (!member) return;
    const now = new Date().toISOString();
    updateMember(id, { status: 'approved', reviewedBy: user?.name, reviewedAt: now, mustChangePassword: true });
    logAudit(user, 'edit', 'ตรวจสอบสมาชิกใหม่', `อนุมัติสมาชิก ${member.name} (${member.email})`);
    sendApprovalEmail(member.email, member.name);
    setDetailId(null);
    refresh();
  };

  const handleReject = (reason: string) => {
    if (!rejectId || !reason) return;
    const member = members.find(m => m.id === rejectId);
    if (!member) return;
    const now = new Date().toISOString();
    updateMember(rejectId, { status: 'rejected', rejectionReason: reason, reviewedBy: user?.name, reviewedAt: now });
    logAudit(user, 'edit', 'ตรวจสอบสมาชิกใหม่', `ปฏิเสธสมาชิก ${member.name} (${member.email}): ${reason}`);
    sendRejectionEmail(member.email, member.name, reason);
    setRejectId(null);
    setDetailId(null);
    refresh();
  };

  const canEdit = can('adminMemberReview', 'edit');

  return (
    <Layout>
      <div className="flex flex-col h-full">
        <div className="bg-blue-50 border-b-2 border-blue-100 px-6 py-4 flex items-center justify-between shadow-sm flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-navy-700 rounded-xl flex items-center justify-center">
              <UserCheck size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-navy-700">ตรวจสอบสมาชิกใหม่</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm text-gray-600">ตรวจสอบข้อมูล/เอกสาร และอนุมัติหรือปฏิเสธผู้สมัครสมาชิกใหม่</span>
                <span className="bg-amber-400 text-navy-900 text-sm font-bold px-2.5 py-0.5 rounded-full">
                  รอตรวจสอบ {pendingCount} รายการ
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5">
          <div className="card overflow-hidden shadow-md">
            <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 border-b">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="ค้นหาชื่อ/อีเมล"
                  className="input-field pl-10 w-64"
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value as MemberStatus | 'all'); setPage(1); }}
                className="input-field w-auto"
              >
                <option value="pending">รอตรวจสอบ</option>
                <option value="approved">อนุมัติแล้ว</option>
                <option value="rejected">ปฏิเสธแล้ว</option>
                <option value="all">ทั้งหมด</option>
              </select>
              <span className="text-base text-gray-500">พบ {filtered.length} รายการ</span>
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-gray-400">
                <CheckCircle2 size={48} className="text-green-400 mb-3" />
                <p className="text-xl font-semibold text-gray-500">ไม่พบผู้สมัครตามเงื่อนไข</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xl">
                  <thead className="bg-blue-200">
                    <tr>
                      <th scope="col" className="text-left text-xl font-semibold text-navy-700 px-4 py-2.5">ชื่อ</th>
                      <th scope="col" className="text-left text-xl font-semibold text-navy-700 px-4 py-2.5">ประเภท</th>
                      <th scope="col" className="text-left text-xl font-semibold text-navy-700 px-4 py-2.5">วันที่สมัคร</th>
                      <th scope="col" className="text-center text-xl font-semibold text-navy-700 px-4 py-2.5">สถานะ</th>
                      <th scope="col" className="text-center text-xl font-semibold text-navy-700 px-4 py-2.5">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((m, idx) => (
                      <tr key={m.id} className={`border-t border-gray-50 ${idx % 2 === 1 ? 'bg-blue-50' : 'bg-white'}`}>
                        <td className="px-4 py-2.5 text-gray-900 font-semibold">{m.name}</td>
                        <td className="px-4 py-2.5 text-gray-700">{m.authType === 'google' ? 'ชาวต่างชาติ' : 'ประชาชนไทย'}</td>
                        <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{formatThaiDateTime(m.registeredAt)}</td>
                        <td className="px-4 py-2.5 text-center"><StatusBadge status={MEMBER_STATUS_LABEL[m.status ?? 'approved']} /></td>
                        <td className="px-4 py-2.5 text-center">
                          <div className="flex gap-2 justify-center">
                            <button onClick={() => setDetailId(m.id)} className="btn-secondary text-base py-1.5 px-4 inline-flex items-center gap-1.5">
                              <Eye size={16} /> ดูรายละเอียด
                            </button>
                            {m.status === 'pending' && canEdit && (
                              <>
                                <button onClick={() => handleApprove(m.id)} className="btn-primary text-base py-1.5 px-4">อนุมัติ</button>
                                <button onClick={() => setRejectId(m.id)} className="btn-danger text-base py-1.5 px-4">ปฏิเสธ</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination total={filtered.length} page={safePage} pageSize={PAGE_SIZE} onPageChange={setPage} />
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={detailMember !== null} onClose={() => setDetailId(null)} title="รายละเอียดใบสมัครสมาชิก" size="lg" icon={<UserCheck size={20} className="text-white" />}>
        {detailMember && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {detailMember.picture ? (
                <img src={detailMember.picture} alt="รูปโปรไฟล์" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-navy-700 text-white flex items-center justify-center text-2xl font-bold" aria-hidden="true">
                  {detailMember.name.charAt(0)}
                </div>
              )}
              <div>
                <p className="text-xl font-bold text-gray-900">{detailMember.name}</p>
                <StatusBadge status={MEMBER_STATUS_LABEL[detailMember.status ?? 'approved']} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <DetailRow label="อีเมล" value={detailMember.email} />
              <DetailRow label="เบอร์โทรศัพท์" value={detailMember.phone} />
              {detailMember.authType === 'google' ? (
                <>
                  <DetailRow label="เลขที่หนังสือเดินทาง" value={detailMember.passportNumber ?? ''} />
                  <DetailRow label="สัญชาติ" value={detailMember.nationality ?? ''} />
                </>
              ) : (
                <DetailRow label="เลขประจำตัวประชาชน" value={detailMember.nationalId ?? ''} />
              )}
              <DetailRow label="ประเภทผู้ใช้งาน" value={detailMember.memberType} />
              <DetailRow label="วัตถุประสงค์การใช้งาน" value={detailMember.purpose} />
              <DetailRow label="วันที่สมัคร" value={formatThaiDateTime(detailMember.registeredAt)} />
              {detailMember.reviewedBy && <DetailRow label="ตรวจสอบโดย" value={`${detailMember.reviewedBy} (${formatThaiDateTime(detailMember.reviewedAt ?? '')})`} />}
            </div>

            <DetailRow label="ที่อยู่" value={`${detailMember.address} ${detailMember.province} ${detailMember.postalCode}`} />
            {detailMember.rejectionReason && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-semibold text-red-700">เหตุผลที่ปฏิเสธ</p>
                <p className="text-lg text-red-800">{detailMember.rejectionReason}</p>
              </div>
            )}

            {detailMember.passportScan && (
              <div>
                <p className="text-sm font-semibold text-gray-500 mb-1">สแกนหนังสือเดินทาง</p>
                <img src={detailMember.passportScan} alt="สแกนหนังสือเดินทาง" className="w-full max-h-96 object-contain rounded-lg border border-gray-200" />
              </div>
            )}

            {detailMember.status === 'pending' && canEdit && (
              <div className="flex gap-3 justify-end pt-2 border-t">
                <button onClick={() => setRejectId(detailMember.id)} className="btn-danger">ปฏิเสธ</button>
                <button onClick={() => handleApprove(detailMember.id)} className="btn-primary">อนุมัติ</button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <RejectModal isOpen={rejectId !== null} onClose={() => setRejectId(null)} onConfirm={handleReject} />
    </Layout>
  );
}
