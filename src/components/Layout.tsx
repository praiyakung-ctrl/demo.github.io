import { useState, type ReactNode } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

/* Visually hidden until focused — lets keyboard users jump past the navbar/sidebar */
export function SkipLink() {
  return (
    <a href="#main-content" className="skip-link">
      ข้ามไปยังเนื้อหาหลัก
    </a>
  );
}

interface LayoutProps {
  children: ReactNode;
  fullWidth?: boolean;
}

export function Layout({ children, fullWidth = false }: LayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <SkipLink />
      <Navbar onMenuClick={!fullWidth ? () => setMobileNavOpen(v => !v) : undefined} />
      <div className="flex flex-1 min-h-0">
        {!fullWidth && <Sidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />}
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto bg-gray-50 focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
