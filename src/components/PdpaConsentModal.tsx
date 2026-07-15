import { useId, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useDialog } from '../hooks/useDialog';

interface PdpaConsentModalProps {
  isOpen: boolean;
  onAccept: () => void;
}

/* Blocking PDPA consent dialog: no close button, backdrop click and Escape
   do not dismiss it — consent is required before using the system. */
export function PdpaConsentModal({ isOpen, onAccept }: PdpaConsentModalProps) {
  const dialogRef = useDialog(isOpen, () => {});
  const titleId = useId();
  const descId = useId();
  const [declined, setDeclined] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center gap-3 px-6 py-4 bg-navy-700 rounded-t-xl">
          <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center" aria-hidden="true">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <h3 id={titleId} className="text-xl font-bold text-white">การคุ้มครองข้อมูลส่วนบุคคล (PDPA)</h3>
        </div>
        <div className="p-5 space-y-4">
          <p id={descId} className="text-lg text-gray-700 leading-relaxed">
            ระบบนี้มีการเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลของท่าน ได้แก่
            ข้อมูลสำหรับการเข้าใช้งานระบบ และข้อมูลจากการเชื่อมโยง/แลกเปลี่ยนข้อมูลระหว่างระบบ
            (Data Integration) เพื่อวัตถุประสงค์ในการให้บริการ ตรวจสอบสิทธิ์การเข้าถึง
            และปฏิบัติตามกฎหมายที่เกี่ยวข้อง ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
          </p>
          {declined && (
            <p role="alert" className="text-lg text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              ท่านต้องยอมรับเงื่อนไขการคุ้มครองข้อมูลส่วนบุคคล (PDPA) ก่อนจึงจะสามารถใช้งานระบบได้
            </p>
          )}
          <div className="flex gap-3 justify-end">
            <button onClick={() => setDeclined(true)} className="btn-secondary text-lg">
              ไม่ยอมรับ (Decline)
            </button>
            <button onClick={onAccept} className="btn-primary text-lg">
              ยอมรับ (Accept)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
