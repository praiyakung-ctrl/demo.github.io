import { useState } from 'react';
import { Cookie, ShieldCheck } from 'lucide-react';
import { Modal } from './Modal';

interface PdpaConsentBannerProps {
  isOpen: boolean;
  onAccept: () => void;
}

/* PDPA/cookie consent banner pinned to the bottom of the page.
   Declining keeps the banner visible with a warning that consent is required. */
export function PdpaConsentBanner({ isOpen, onAccept }: PdpaConsentBannerProps) {
  const [declined, setDeclined] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);

  if (!isOpen) return null;

  return (
    <>
      <div
        role="region"
        aria-label="การคุ้มครองข้อมูลส่วนบุคคล (PDPA)"
        className="fixed bottom-0 inset-x-0 z-[2000] bg-blue-50 border-t-4 border-navy-700 shadow-[0_-4px_16px_rgba(0,0,0,0.15)]"
      >
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-start gap-3 flex-1">
              <ShieldCheck size={28} className="text-navy-700 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-lg font-bold text-navy-700 mb-0.5">การคุ้มครองข้อมูลส่วนบุคคล (PDPA)</p>
                <p className="text-base text-gray-700 leading-relaxed">
                  ระบบนี้มีการเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลของท่าน ได้แก่
                  ข้อมูลสำหรับการเข้าใช้งานระบบ และข้อมูลจากการเชื่อมโยง/แลกเปลี่ยนข้อมูลระหว่างระบบ
                  (Data Integration) เพื่อวัตถุประสงค์ในการให้บริการ ตรวจสอบสิทธิ์การเข้าถึง
                  และปฏิบัติตามกฎหมายที่เกี่ยวข้อง ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0 lg:justify-end">
              <button
                onClick={() => setShowPolicy(true)}
                className="text-lg text-navy-700 hover:text-navy-500 hover:underline font-medium"
              >
                Cookies Policy
              </button>
              <button onClick={() => setDeclined(true)} className="btn-secondary text-lg">
                ไม่ยอมรับ
              </button>
              <button onClick={onAccept} className="btn-primary text-lg">
                ยอมรับ
              </button>
            </div>
          </div>
          {declined && (
            <p role="alert" className="mt-3 text-base text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
              ท่านต้องยอมรับเงื่อนไขการคุ้มครองข้อมูลส่วนบุคคล (PDPA) ก่อนจึงจะสามารถใช้งานระบบได้
            </p>
          )}
        </div>
      </div>

      {/* Cookies policy details */}
      <Modal
        isOpen={showPolicy}
        onClose={() => setShowPolicy(false)}
        title="นโยบายคุกกี้ (Cookies Policy)"
        size="md"
        icon={<Cookie size={20} className="text-white" />}
      >
        <div className="space-y-3 text-lg text-gray-700 leading-relaxed">
          <p>
            เว็บไซต์นี้ใช้คุกกี้และเทคโนโลยีที่คล้ายกัน เพื่อให้ระบบสามารถทำงานได้อย่างถูกต้อง
            จดจำการตั้งค่าการใช้งานของท่าน และรักษาความปลอดภัยในการเข้าสู่ระบบ
          </p>
          <p className="font-semibold text-gray-900">ประเภทคุกกี้ที่ใช้งาน</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><span className="font-medium">คุกกี้ที่จำเป็น</span> — ใช้สำหรับการเข้าสู่ระบบ การตรวจสอบสิทธิ์ และการรักษาความปลอดภัย ไม่สามารถปิดการใช้งานได้</li>
            <li><span className="font-medium">คุกกี้เพื่อการใช้งาน</span> — ใช้จดจำการตั้งค่าของท่าน เช่น ชื่อผู้ใช้ที่บันทึกไว้ และการตั้งค่าการเข้าถึง (Accessibility)</li>
          </ul>
          <p>
            ท่านสามารถศึกษารายละเอียดเพิ่มเติมเกี่ยวกับการคุ้มครองข้อมูลส่วนบุคคลได้ตาม
            พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
          </p>
          <button onClick={() => setShowPolicy(false)} className="btn-primary w-full py-2.5 text-lg">
            ปิด
          </button>
        </div>
      </Modal>
    </>
  );
}
