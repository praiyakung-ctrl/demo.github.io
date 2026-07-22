import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Map, LayoutDashboard, FileText, BarChart3, BellRing, Camera, Users, ChevronDown, ChevronLeft, ChevronRight, ListTree, MonitorPlay, Plug, ScrollText, Settings, ShieldAlert, ShieldCheck, SlidersHorizontal, Wrench } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { savedMenuSettings } from '../utils/menuStorage';
import type { MenuKey } from '../types';

type Section = 'main' | 'admin' | 'backend';

/* Static per-menu config (route + icon); label/order/enabled come from
   menu settings (/admin/menus), visibility from group permissions. */
const MENU_CONFIG: Record<MenuKey, { to: string; icon: typeof Map; iconColor: string; section: Section }> = {
  map:          { to: '/map',            icon: Map,             iconColor: 'text-cyan-500',   section: 'main' },
  dashboard:    { to: '/dashboard',      icon: LayoutDashboard, iconColor: 'text-blue-600',   section: 'main' },
  portal:       { to: '/portal',         icon: FileText,        iconColor: 'text-green-600',  section: 'main' },
  reports:      { to: '/reports',        icon: BarChart3,       iconColor: 'text-amber-500',  section: 'main' },
  liveViewer:   { to: '/live-viewer',    icon: MonitorPlay,     iconColor: 'text-violet-500', section: 'main' },
  adminCameras: { to: '/admin/cameras',  icon: Camera,          iconColor: 'text-pink-500',   section: 'admin' },
  adminUsers:   { to: '/admin/users',    icon: Users,           iconColor: 'text-purple-500', section: 'admin' },
  adminRepairs: { to: '/admin/repairs',  icon: Wrench,          iconColor: 'text-orange-500', section: 'admin' },
  adminIncidents: { to: '/admin/incidents', icon: ShieldAlert,  iconColor: 'text-red-500',    section: 'admin' },
  adminGroups:  { to: '/admin/groups',   icon: ShieldCheck,     iconColor: 'text-teal-600',   section: 'admin' },
  adminMenus:   { to: '/admin/menus',    icon: ListTree,        iconColor: 'text-indigo-500', section: 'admin' },
  adminAuditLog: { to: '/admin/audit-log', icon: ScrollText,    iconColor: 'text-rose-500',   section: 'backend' },
  adminApi:      { to: '/admin/api',       icon: Plug,          iconColor: 'text-sky-500',    section: 'backend' },
  adminNotifications: { to: '/admin/notifications', icon: BellRing, iconColor: 'text-yellow-600', section: 'backend' },
  adminSettings: { to: '/admin/settings',  icon: Settings,      iconColor: 'text-slate-500',  section: 'backend' },
};

const SECTION_META: Record<Section, { title: string; icon: typeof Map }> = {
  main:    { title: 'Main Menu',     icon: Map },
  admin:   { title: 'จัดการระบบ',    icon: Settings },
  backend: { title: 'System Config', icon: SlidersHorizontal },
};

export function Sidebar() {
  const { can } = useAuth();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(true);

  // start with only the group of the current page expanded
  const [openSections, setOpenSections] = useState<Record<Section, boolean>>(() => {
    const active = (Object.values(MENU_CONFIG).find(c => pathname.startsWith(c.to))?.section ?? 'main') as Section;
    return { main: active === 'main', admin: active === 'admin', backend: active === 'backend' };
  });

  const toggleSection = (section: Section) =>
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));

  // read fresh per render so edits on /admin/menus apply on the next navigation
  const visibleItems = savedMenuSettings()
    .filter(s => s.enabled && can(s.key, 'view'))
    .map(s => ({ ...MENU_CONFIG[s.key], label: s.label, menuKey: s.key }));

  const sections: Section[] = ['main', 'admin', 'backend'];

  const activeClass = (extra = '') =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-navy-700 border-2 border-navy-700 bg-navy-50 font-bold transition-all ${extra}`;
  const inactiveClass = (extra = '') =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-navy-700 hover:bg-gray-100 font-bold transition-all ${extra}`;

  const collapseButton = (
    <button
      onClick={e => { e.stopPropagation(); setCollapsed(!collapsed); }}
      className="p-1.5 rounded-lg text-navy-500 hover:text-navy-700 hover:bg-gray-200 transition-colors flex-shrink-0"
      title={collapsed ? 'ขยายเมนู' : 'ย่อเมนู'}
      aria-label={collapsed ? 'ขยายเมนู' : 'ย่อเมนู'}
      aria-expanded={!collapsed}
    >
      {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
    </button>
  );

  return (
    <aside
      className="flex flex-col flex-shrink-0 min-h-0 bg-gray-100 border-r border-gray-200 transition-all duration-300"
      style={{ width: collapsed ? '64px' : '240px' }}
    >
      <nav aria-label="เมนูหลัก" className="flex-1 px-2 space-y-1 overflow-y-auto overflow-x-hidden pt-3 pb-2">
        {/* sidebar collapse toggle — collapsed mode has no room for it inside headers */}
        {collapsed && <div className="flex justify-center pb-1">{collapseButton}</div>}

        {sections.map(section => {
          const items = visibleItems.filter(i => i.section === section);
          if (items.length === 0) return null;
          const meta = SECTION_META[section];
          const open = openSections[section];
          return (
            <div key={section}>
              {/* Section header: click toggles its sub-menu */}
              <div className={`${section === 'main' ? 'pt-0' : 'pt-2'} pb-1 flex items-center gap-1`}>
                <button
                  onClick={() => toggleSection(section)}
                  aria-expanded={open}
                  aria-label={`${open ? 'ซ่อน' : 'แสดง'}เมนู ${meta.title}`}
                  title={collapsed ? meta.title : undefined}
                  className={`flex-1 flex items-center rounded-lg hover:bg-gray-200 transition-colors ${
                    collapsed ? 'justify-center p-1.5' : 'gap-2 px-2 py-1.5'
                  }`}
                >
                  <meta.icon size={collapsed ? 18 : 16} className="text-navy-500 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="text-base font-extrabold text-navy-700 uppercase tracking-widest whitespace-nowrap">
                        {meta.title}
                      </span>
                      <div className="flex-1 border-t border-navy-200" />
                      <ChevronDown
                        size={16}
                        className={`text-navy-500 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                      />
                    </>
                  )}
                </button>
                {section === 'main' && !collapsed && collapseButton}
              </div>

              {/* Sub-menu items */}
              {open && items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={collapsed ? item.label : undefined}
                  aria-label={item.label}
                  className={({ isActive }) =>
                    isActive
                      ? activeClass(collapsed ? 'justify-center' : '')
                      : inactiveClass(collapsed ? 'justify-center' : '')
                  }
                >
                  <item.icon size={20} className={`flex-shrink-0 ${item.iconColor}`} />
                  {!collapsed && <span className="text-lg font-bold text-navy-700 whitespace-nowrap">{item.label}</span>}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="px-3 py-3 border-t border-gray-200">
          <p className="text-xs text-navy-400 text-center">อบจ.ชลบุรี © 2568</p>
        </div>
      )}
    </aside>
  );
}
