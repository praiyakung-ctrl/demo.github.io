import type { ReactNode } from 'react';
import { Clock, ExternalLink, Mail, MapPin, Phone, Printer } from 'lucide-react';
import { SkipLink } from '../components/Layout';
import { Navbar } from '../components/Navbar';
import { CitizenFooter, CitizenHero, ServiceSidebar } from '../components/CitizenPortalUI';

const PHONE_NUMBERS = ['038-398-038', '038-398-039', '038-398-040', '038-398-041', '038-398-042', '038-398-043'];

const MAPS_URL = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('องค์การบริหารส่วนจังหวัดชลบุรี');

function ContactRow({ icon: Icon, label, children }: { icon: typeof MapPin; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-full bg-navy-50 text-navy-700 flex items-center justify-center flex-shrink-0">
        <Icon size={24} />
      </div>
      <div className="min-w-0 pt-0.5">
        <p className="text-lg text-gray-500 leading-tight">{label}</p>
        <div className="text-2xl font-bold text-navy-700 leading-snug">{children}</div>
      </div>
    </div>
  );
}

export function AboutPage() {
  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col">
      <SkipLink />
      <Navbar />
      <CitizenHero title="เกี่ยวกับ อบจ.ชลบุรี" />

      <div className="flex-1 w-full max-w-[1400px] mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-5 items-start">
        <aside className="hidden lg:block">
          <ServiceSidebar active="about" />
        </aside>

        <main id="main-content" tabIndex={-1} className="min-w-0 focus:outline-none space-y-5">
          <div className="card">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-5 border-b border-gray-100">
              <img
                src={`${import.meta.env.BASE_URL}logo.svg`}
                alt="ตราสัญลักษณ์ อบจ.ชลบุรี"
                className="w-24 h-24 flex-shrink-0"
              />
              <div className="text-center sm:text-left">
                <h2 className="text-4xl font-extrabold text-navy-700 leading-tight">องค์การบริหารส่วนจังหวัดชลบุรี</h2>
                <p className="text-xl text-gray-500 mt-1">CHONBURI PROVINCIAL ADMINISTRATIVE ORGANIZATION</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 pt-5">
              <ContactRow icon={MapPin} label="ที่อยู่">
                <p>333/555 หมู่ที่ 3 ถนนนารถมนตเสวี 1 ตำบลเสม็ด อำเภอเมืองชลบุรี จังหวัดชลบุรี 20000</p>
              </ContactRow>

              <ContactRow icon={Phone} label="โทรศัพท์">
                <p>
                  {PHONE_NUMBERS.map((tel, i) => (
                    <span key={tel}>
                      <a href={`tel:${tel.replace(/-/g, '')}`} className="hover:underline">{tel}</a>
                      {i < PHONE_NUMBERS.length - 1 && ', '}
                    </span>
                  ))}
                </p>
              </ContactRow>

              <ContactRow icon={Printer} label="โทรสาร (แฟกซ์)">
                <p>038-398-036</p>
              </ContactRow>

              <ContactRow icon={Mail} label="อีเมล (สารบรรณกลาง)">
                <a href="mailto:saraban@chon.go.th" className="hover:underline">saraban@chon.go.th</a>
              </ContactRow>

              <ContactRow icon={Clock} label="เวลาทำการ">
                <p>จันทร์ - ศุกร์ 08:30 - 16:30 น.</p>
              </ContactRow>
            </div>

            <div className="pt-6">
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-flex items-center gap-2"
              >
                <MapPin size={22} />
                เปิดแผนที่ Google Maps
                <ExternalLink size={18} />
              </a>
            </div>
          </div>
        </main>
      </div>

      <CitizenFooter />
    </div>
  );
}
