import { useState } from 'react';
import { CheckCircle2, MapPin, Wrench } from 'lucide-react';
import { Layout } from '../components/Layout';
import { ConfirmDialog } from '../components/Modal';
import { resolveReport, savedReports } from '../utils/cameraReports';
import type { CameraReport } from '../utils/cameraReports';
import { formatThaiDateTime } from '../utils/formatDate';
import camerasData from '../data/cameras.json';
import type { Camera } from '../types';

const cameras = camerasData as Camera[];

function cameraOf(id: string): Camera | null {
  return cameras.find(c => c.id === id) ?? null;
}

export function AdminRepairsPage() {
  const [reports, setReports] = useState<CameraReport[]>(() =>
    [...savedReports()].sort((a, b) => (a.status === b.status ? b.reportedAt.localeCompare(a.reportedAt) : a.status === 'pending' ? -1 : 1))
  );
  const [resolveId, setResolveId] = useState<string | null>(null);

  const pendingCount = reports.filter(r => r.status === 'pending').length;

  const handleResolve = () => {
    if (!resolveId) return;
    resolveReport(resolveId);
    setReports(prev => prev.map(r =>
      r.cameraId === resolveId && r.status === 'pending'
        ? { ...r, status: 'resolved', resolvedAt: new Date().toISOString() }
        : r
    ));
    setResolveId(null);
  };

  return (
    <Layout>
      <div className="flex flex-col h-full">
        {/* Page header banner */}
        <div className="bg-blue-50 border-b-2 border-blue-100 px-6 py-4 flex items-center justify-between shadow-sm flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-navy-700 rounded-xl flex items-center justify-center">
              <Wrench size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-navy-700">กล้องรอตรวจสอบ</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm text-gray-600">รายการแจ้งตรวจสอบกล้องที่ออฟไลน์</span>
                <span className="bg-amber-400 text-navy-900 text-sm font-bold px-2.5 py-0.5 rounded-full">
                  รอตรวจสอบ {pendingCount} รายการ
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5">
          <div className="card overflow-hidden shadow-md">
            {reports.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-gray-400">
                <CheckCircle2 size={48} className="text-green-400 mb-3" />
                <p className="text-xl font-semibold text-gray-500">ไม่มีกล้องรอตรวจสอบ</p>
                <p className="text-base mt-1">เมื่อเจ้าหน้าที่แจ้งกล้องออฟไลน์จากหน้าแผนที่ รายการจะแสดงที่นี่</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xl">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="text-left text-lg font-semibold text-gray-600 px-4 py-2.5">กล้อง</th>
                      <th scope="col" className="text-left text-lg font-semibold text-gray-600 px-4 py-2.5">สถานที่</th>
                      <th scope="col" className="text-left text-lg font-semibold text-gray-600 px-4 py-2.5">อาการ / หมายเหตุ</th>
                      <th scope="col" className="text-left text-lg font-semibold text-gray-600 px-4 py-2.5">ผู้แจ้ง</th>
                      <th scope="col" className="text-left text-lg font-semibold text-gray-600 px-4 py-2.5">วันเวลาแจ้ง</th>
                      <th scope="col" className="text-center text-lg font-semibold text-gray-600 px-4 py-2.5">สถานะ</th>
                      <th scope="col" className="text-center text-lg font-semibold text-gray-600 px-4 py-2.5">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(rep => {
                      const cam = cameraOf(rep.cameraId);
                      return (
                        <tr key={`${rep.cameraId}-${rep.reportedAt}`} className="border-t border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-bold text-navy-700">{rep.cameraId}</td>
                          <td className="px-4 py-2.5 text-gray-700">
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin size={16} className="text-navy-400 flex-shrink-0" />
                              {cam?.location ?? '—'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-700">{rep.note || 'ไม่ระบุอาการ'}</td>
                          <td className="px-4 py-2.5 text-gray-700">{rep.reportedBy}</td>
                          <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{formatThaiDateTime(rep.reportedAt)}</td>
                          <td className="px-4 py-2.5 text-center">
                            {rep.status === 'pending' ? (
                              <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-lg font-bold bg-amber-100 text-amber-700">
                                <Wrench size={14} /> รอตรวจสอบ
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-lg font-bold bg-green-100 text-green-700">
                                <CheckCircle2 size={14} /> ตรวจสอบแล้ว
                                {rep.resolvedAt && <span className="font-normal">{formatThaiDateTime(rep.resolvedAt)}</span>}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {rep.status === 'pending' && (
                              <button
                                onClick={() => setResolveId(rep.cameraId)}
                                className="btn-primary text-base py-1.5 px-4"
                              >
                                ตรวจสอบแล้ว
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={resolveId !== null}
        onClose={() => setResolveId(null)}
        onConfirm={handleResolve}
        title="ยืนยันการตรวจสอบ"
        message={`ยืนยันว่าได้ตรวจสอบกล้อง ${resolveId ?? ''} เรียบร้อยแล้วใช่หรือไม่?`}
        confirmLabel="ตรวจสอบแล้ว"
      />
    </Layout>
  );
}
