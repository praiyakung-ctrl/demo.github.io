import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, BookOpen, FileDown, FileSearch, Info, LogIn, ShieldCheck, UserPlus, Video } from 'lucide-react';
import { SkipLink } from '../components/Layout';
import { Navbar } from '../components/Navbar';
import { CitizenFooter, CitizenHero, ServiceSidebar } from '../components/CitizenPortalUI';
import { StatusBadge } from '../components/Badge';
import { exportElementToPdf, todayStamp } from '../utils/exportReport';

interface Callout {
  type: 'note' | 'warning';
  text: string;
}

interface Chapter {
  icon: typeof BookOpen;
  title: string;
  intro: string;
  steps: { title: string; detail: string }[];
  callouts: Callout[];
  /* ปุ่มทางลัดไปหน้าจริง */
  shortcut?: { label: string; to: string };
  /* บทที่ 4 แสดงตารางสรุปสถานะคำขอ */
  statusTable?: boolean;
}

const CHAPTERS: Chapter[] = [
  {
    icon: UserPlus,
    title: 'การลงทะเบียนใช้งาน',
    intro: 'ผู้ประสงค์ใช้บริการต้องลงทะเบียนเป็นสมาชิกก่อน จึงจะสามารถยื่นคำขอเข้าถึงข้อมูลภาพจากกล้อง CCTV ได้',
    steps: [
      { title: 'เปิดหน้าสมัครสมาชิก', detail: 'จากหน้าเข้าสู่ระบบ เลือกเมนู "สมัครสมาชิก" เพื่อเข้าสู่แบบฟอร์มการลงทะเบียน' },
      { title: 'กรอกข้อมูลส่วนบุคคล', detail: 'กรอกชื่อ-นามสกุล เลขบัตรประจำตัวประชาชน หมายเลขโทรศัพท์ และไปรษณีย์อิเล็กทรอนิกส์ (อีเมล) ให้ครบถ้วนและถูกต้องตรงตามความเป็นจริง' },
      { title: 'ให้ความยินยอมตาม PDPA', detail: 'อ่านและกดยอมรับข้อความขอความยินยอมในการเก็บรวบรวมและใช้ข้อมูลส่วนบุคคล ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562' },
      { title: 'ยืนยันการลงทะเบียน', detail: 'ตรวจสอบความถูกต้องของข้อมูลแล้วกดยืนยัน ระบบจะแจ้งผลการลงทะเบียนและเปิดใช้บัญชีให้ตามขั้นตอน' },
    ],
    callouts: [
      { type: 'note', text: 'โปรดใช้อีเมลที่ใช้งานได้จริง เนื่องจากระบบจะใช้เป็นช่องทางแจ้งผลการพิจารณาคำขอและข่าวสารที่เกี่ยวข้อง' },
    ],
    shortcut: { label: 'ไปหน้าสมัครสมาชิก', to: '/register' },
  },
  {
    icon: LogIn,
    title: 'การเข้าสู่ระบบ',
    intro: 'สมาชิกที่ลงทะเบียนแล้วสามารถเข้าสู่ระบบเพื่อใช้บริการยื่นคำขอและติดตามสถานะได้ตลอด 24 ชั่วโมง',
    steps: [
      { title: 'เปิดหน้าเข้าสู่ระบบ', detail: 'เข้าเว็บไซต์ของระบบ หน้าแรกจะเป็นหน้าเข้าสู่ระบบโดยอัตโนมัติ' },
      { title: 'กรอกชื่อผู้ใช้และรหัสผ่าน', detail: 'กรอกชื่อผู้ใช้งาน (Username) และรหัสผ่านที่ได้จากการลงทะเบียน แล้วกดปุ่ม "เข้าสู่ระบบ"' },
      { title: 'เข้าสู่หน้าบริการประชาชน', detail: 'เมื่อเข้าสู่ระบบสำเร็จ ระบบจะนำท่านไปยังหน้าบริการประชาชน ซึ่งแสดงคำขอของท่านและเมนูบริการทั้งหมด' },
    ],
    callouts: [
      { type: 'warning', text: 'ห้ามเปิดเผยรหัสผ่านแก่บุคคลอื่น และเพื่อความปลอดภัย ระบบจะออกจากระบบให้โดยอัตโนมัติเมื่อไม่มีการใช้งานตามระยะเวลาที่กำหนด' },
    ],
    shortcut: { label: 'ไปหน้าเข้าสู่ระบบ', to: '/login' },
  },
  {
    icon: Video,
    title: 'การยื่นคำขอเข้าดูข้อมูลกล้อง CCTV',
    intro: 'ขั้นตอนการยื่นคำขอเข้าถึงข้อมูลภาพจากกล้องโทรทัศน์วงจรปิดขององค์การบริหารส่วนจังหวัดชลบุรี',
    steps: [
      { title: 'เลือกเมนูยื่นคำขอ', detail: 'จากหน้าบริการประชาชน เลือกเมนู "ยื่นคำขอเข้าดูข้อมูลกล้อง CCTV" เพื่อเริ่มกรอกแบบคำขอ' },
      { title: 'กรอกรายละเอียดเหตุการณ์', detail: 'ระบุประเภทเหตุการณ์ (เช่น อุบัติเหตุ คดีความ) วันที่ ช่วงเวลา และสถานที่เกิดเหตุโดยละเอียด เพื่อให้เจ้าหน้าที่ค้นหาภาพได้ตรงจุด' },
      { title: 'เลือกกล้องจากแผนที่', detail: 'เลือกกล้อง CCTV ที่คาดว่าบันทึกเหตุการณ์ได้จากแผนที่ในระบบ สามารถเลือกได้มากกว่าหนึ่งตัวหากเหตุการณ์ครอบคลุมหลายจุด' },
      { title: 'แนบเอกสารประกอบ', detail: 'แนบสำเนาบัตรประจำตัวประชาชน และใบแจ้งความหรือบันทึกประจำวันจากสถานีตำรวจ (กรณีเป็นคดีความหรืออุบัติเหตุ)' },
      { title: 'ยืนยันและรับหมายเลขคำขอ', detail: 'ตรวจสอบข้อมูลทั้งหมดแล้วกดยืนยัน ระบบจะออกหมายเลขคำขอ (เช่น REQ-2026-001) สำหรับใช้ติดตามสถานะ' },
    ],
    callouts: [
      { type: 'warning', text: 'ระบบจัดเก็บภาพย้อนหลังประมาณ 30 วันเท่านั้น เมื่อเกิดเหตุการณ์โปรดยื่นคำขอโดยเร็วที่สุด เพื่อป้องกันมิให้ข้อมูลภาพถูกลบตามรอบการจัดเก็บ' },
    ],
    shortcut: { label: 'ไปยื่นคำขอเลย', to: '/portal/request' },
  },
  {
    icon: FileSearch,
    title: 'การติดตามสถานะคำขอ',
    intro: 'ท่านสามารถติดตามความคืบหน้าของคำขอได้ด้วยตนเองผ่านระบบ โดยไม่ต้องเดินทางมาติดต่อที่สำนักงาน',
    steps: [
      { title: 'เลือกเมนูตรวจสอบสถานะคำขอ', detail: 'จากหน้าบริการประชาชน เลือกเมนู "ตรวจสอบสถานะคำขอ" ระบบจะแสดงคำขอทั้งหมดของท่าน' },
      { title: 'เลือกคำขอที่ต้องการดูรายละเอียด', detail: 'กดที่รายการคำขอ ระบบจะแสดงรายละเอียดพร้อมลำดับขั้นการดำเนินการ (Timeline) ของคำขอนั้น' },
      { title: 'รอรับการแจ้งเตือน', detail: 'เมื่อสถานะคำขอเปลี่ยนแปลง ระบบจะแจ้งเตือนผ่านกระดิ่งบนหน้าจอ โปรดเข้าระบบเป็นระยะเพื่อติดตามผล' },
    ],
    callouts: [],
    shortcut: { label: 'ไปตรวจสอบสถานะ', to: '/portal' },
    statusTable: true,
  },
  {
    icon: ShieldCheck,
    title: 'การรับข้อมูลและข้อปฏิบัติ',
    intro: 'เมื่อคำขอได้รับอนุมัติ โปรดปฏิบัติตามเงื่อนไขการรับและการใช้ข้อมูลอย่างเคร่งครัด',
    steps: [
      { title: 'รับแจ้งผลการพิจารณา', detail: 'เมื่อสถานะคำขอเป็น "ส่งแล้ว" เจ้าหน้าที่จะแจ้งช่องทางการรับข้อมูลภาพผ่านระบบหรือช่องทางติดต่อที่ท่านระบุไว้' },
      { title: 'รับข้อมูลภาพตามช่องทางที่กำหนด', detail: 'รับไฟล์วิดีโอหรือภาพนิ่งตามช่วงเวลาที่ได้รับอนุมัติ โดยข้อมูลของบุคคลภายนอกที่ไม่เกี่ยวข้องจะถูกปกปิดตามหลักเกณฑ์' },
      { title: 'ยืนยันการรับข้อมูล', detail: 'เมื่อได้รับข้อมูลครบถ้วนแล้ว สถานะคำขอจะเปลี่ยนเป็น "ได้รับแล้ว" ถือว่าการให้บริการเสร็จสิ้น' },
    ],
    callouts: [
      { type: 'warning', text: 'ข้อมูลภาพที่ได้รับอนุญาตให้นำไปใช้เฉพาะตามวัตถุประสงค์ที่ระบุในคำขอเท่านั้น ห้ามเผยแพร่ต่อสาธารณะหรือนำไปใช้ละเมิดสิทธิของบุคคลอื่น มิฉะนั้นอาจมีความผิดตามกฎหมาย' },
      { type: 'note', text: 'หากมีข้อสงสัยเพิ่มเติม ติดต่อเจ้าหน้าที่ได้ที่หมายเลข 038-398-333 ในวันจันทร์ - ศุกร์ เวลา 08:30 - 16:30 น.' },
    ],
  },
];

const STATUS_DESCRIPTIONS: { status: string; description: string }[] = [
  { status: 'ใหม่', description: 'ระบบได้รับคำขอแล้ว อยู่ระหว่างรอเจ้าหน้าที่ตรวจสอบเบื้องต้น' },
  { status: 'รอดำเนินการ', description: 'เจ้าหน้าที่กำลังตรวจสอบเอกสารและพิจารณาคำขอ' },
  { status: 'รอภาพ', description: 'คำขอได้รับอนุมัติแล้ว อยู่ระหว่างจัดเตรียมข้อมูลภาพจากกล้อง' },
  { status: 'ส่งแล้ว', description: 'จัดส่งข้อมูลภาพให้ผู้ยื่นคำขอแล้ว รอการยืนยันการรับข้อมูล' },
  { status: 'ได้รับแล้ว', description: 'ผู้ยื่นคำขอได้รับข้อมูลครบถ้วน การให้บริการเสร็จสิ้น' },
];

function CalloutBox({ callout }: { callout: Callout }) {
  const isWarning = callout.type === 'warning';
  return (
    <div className={`flex items-start gap-3 rounded-xl border-2 px-4 py-3 ${
      isWarning ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'
    }`}>
      {isWarning
        ? <AlertTriangle size={22} className="text-amber-600 mt-0.5 flex-shrink-0" />
        : <Info size={22} className="text-blue-600 mt-0.5 flex-shrink-0" />}
      <div>
        <p className={`text-lg font-bold ${isWarning ? 'text-amber-700' : 'text-blue-700'}`}>
          {isWarning ? 'ข้อควรระวัง' : 'หมายเหตุ'}
        </p>
        <p className="text-lg text-gray-700 leading-relaxed">{callout.text}</p>
      </div>
    </div>
  );
}

/* เนื้อหาหนึ่งบท — ใช้ทั้งบนจอและใน container ซ่อนสำหรับ export PDF */
function ChapterContent({ chapter, number, forPrint = false }: { chapter: Chapter; number: number; forPrint?: boolean }) {
  const Icon = chapter.icon;
  return (
    <div>
      {/* Chapter header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-100 mb-5">
        <div className="w-12 h-12 rounded-xl bg-navy-700 text-white flex items-center justify-center flex-shrink-0">
          <Icon size={26} />
        </div>
        <div>
          <p className="text-lg text-gray-500 leading-tight">บทที่ {number}</p>
          <h2 className="text-3xl font-extrabold text-navy-700 leading-tight">{chapter.title}</h2>
        </div>
      </div>

      <p className="text-xl text-gray-700 leading-relaxed mb-5">{chapter.intro}</p>

      {/* Steps timeline */}
      <div className="space-y-1 mb-5">
        {chapter.steps.map((step, i) => (
          <div key={step.title} className="flex items-stretch gap-4">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-navy-700 text-white flex items-center justify-center text-xl font-bold flex-shrink-0">
                {i + 1}
              </div>
              {i < chapter.steps.length - 1 && <div className="w-0.5 flex-1 min-h-[16px] bg-gray-200 my-1" />}
            </div>
            <div className="pt-1 pb-4">
              <p className="text-2xl font-bold text-navy-700 leading-tight">{step.title}</p>
              <p className="text-xl text-gray-600 leading-relaxed mt-1">{step.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Status summary table (chapter 4) */}
      {chapter.statusTable && (
        <div className="mb-5 border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
            <h3 className="text-xl font-bold text-navy-700">ความหมายของสถานะคำขอ</h3>
          </div>
          <table className="w-full">
            <tbody>
              {STATUS_DESCRIPTIONS.map(({ status, description }, idx) => (
                <tr key={status} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-blue-50'} border-b border-blue-100 last:border-b-0`}>
                  <td className="px-4 py-3 whitespace-nowrap align-top"><StatusBadge status={status} /></td>
                  <td className="px-4 py-3 text-lg text-gray-700 leading-relaxed">{description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Callouts */}
      {chapter.callouts.length > 0 && (
        <div className="space-y-3 mb-5">
          {chapter.callouts.map((c, i) => <CalloutBox key={i} callout={c} />)}
        </div>
      )}

      {/* Shortcut to the real page — hidden in the PDF where links are useless */}
      {chapter.shortcut && !forPrint && (
        <Link to={chapter.shortcut.to} className="btn-primary inline-flex items-center gap-2">
          {chapter.shortcut.label} <ArrowRight size={20} />
        </Link>
      )}
    </div>
  );
}

export function ManualPage() {
  const [chapterIndex, setChapterIndex] = useState(0);
  const [exporting, setExporting] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const handleExportPdf = async () => {
    if (exporting || !pdfRef.current) return;
    setExporting(true);
    try {
      await exportElementToPdf(pdfRef.current, `คู่มือการใช้งาน-${todayStamp()}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  const chapter = CHAPTERS[chapterIndex];

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col">
      <SkipLink />
      <Navbar />
      <CitizenHero title="คู่มือการใช้งาน" />

      <div className="flex-1 w-full max-w-[1400px] mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-5 items-start">
        <aside className="hidden lg:block">
          <ServiceSidebar active="manual" />
        </aside>

        <main id="main-content" tabIndex={-1} className="min-w-0 focus:outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-5 items-start">
            {/* Chapter menu */}
            <div className="lg:sticky lg:top-4 space-y-3">
              <div className="card p-0 overflow-hidden">
                <h3 className="text-xl font-bold text-navy-700 px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <BookOpen size={20} /> สารบัญ
                </h3>
                <nav>
                  {CHAPTERS.map((ch, i) => (
                    <button
                      key={ch.title}
                      onClick={() => setChapterIndex(i)}
                      aria-current={i === chapterIndex ? 'page' : undefined}
                      className={`w-full flex items-start gap-2.5 px-4 py-3 text-left text-lg leading-snug transition-colors border-l-4 ${
                        i === chapterIndex
                          ? 'bg-navy-50 border-navy-700 text-navy-700 font-bold'
                          : 'border-transparent text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="font-bold flex-shrink-0">{i + 1}.</span>
                      <span>{ch.title}</span>
                    </button>
                  ))}
                </nav>
              </div>

              <button
                onClick={handleExportPdf}
                disabled={exporting}
                className="btn-secondary w-full flex items-center justify-center gap-2 text-lg disabled:opacity-50"
              >
                <FileDown size={20} />
                {exporting ? 'กำลังจัดทำไฟล์...' : 'ดาวน์โหลดคู่มือ (PDF)'}
              </button>
            </div>

            {/* Chapter content */}
            <div className="card min-w-0">
              <ChapterContent chapter={chapter} number={chapterIndex + 1} />

              {/* prev/next chapter */}
              <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setChapterIndex(i => Math.max(0, i - 1))}
                  disabled={chapterIndex === 0}
                  className="btn-secondary text-lg disabled:opacity-40"
                >
                  ← บทก่อนหน้า
                </button>
                <span className="text-lg text-gray-500">บทที่ {chapterIndex + 1} / {CHAPTERS.length}</span>
                <button
                  onClick={() => setChapterIndex(i => Math.min(CHAPTERS.length - 1, i + 1))}
                  disabled={chapterIndex === CHAPTERS.length - 1}
                  className="btn-secondary text-lg disabled:opacity-40"
                >
                  บทถัดไป →
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Off-screen full manual used only for the PDF export */}
      <div ref={pdfRef} aria-hidden="true" className="fixed -left-[9999px] top-0 w-[900px] bg-white p-8">
        <div className="text-center pb-5 mb-6 border-b-2 border-navy-700">
          <h1 className="text-4xl font-extrabold text-navy-700">คู่มือการใช้งานระบบสำหรับประชาชน</h1>
          <p className="text-xl text-gray-600 mt-1">
            ระบบฐานข้อมูลเพื่อการเข้าถึง (Data Integration and End Users) · องค์การบริหารส่วนจังหวัดชลบุรี
          </p>
        </div>
        {CHAPTERS.map((ch, i) => (
          <div key={ch.title} className={i > 0 ? 'mt-8 pt-8 border-t border-gray-200' : ''}>
            <ChapterContent chapter={ch} number={i + 1} forPrint />
          </div>
        ))}
      </div>

      <CitizenFooter />
    </div>
  );
}
