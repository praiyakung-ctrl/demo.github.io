import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Map, LayoutDashboard, FileText, BarChart3, Camera, Users, ChevronLeft, ChevronRight, ListTree, Plug, ScrollText, Settings, ShieldCheck, Wrench } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { savedMenuSettings } from '../utils/menuStorage';
import type { MenuKey } from '../types';

/* Static per-menu config (route + icon); label/order/enabled come from
   menu settings (/admin/menus), visibility from group permissions. */
const MENU_CONFIG: Record<MenuKey, { to: string; icon: typeof Map; iconColor: string; section: 'main' | 'admin' }> = {
  map:          { to: '/map',            icon: Map,             iconColor: 'text-cyan-500',   section: 'main' },
  dashboard:    { to: '/dashboard',      icon: LayoutDashboard, iconColor: 'text-blue-600',   section: 'main' },
  portal:       { to: '/portal',         icon: FileText,        iconColor: 'text-green-600',  section: 'main' },
  reports:      { to: '/reports',        icon: BarChart3,       iconColor: 'text-amber-500',  section: 'main' },
  adminCameras: { to: '/admin/cameras',  icon: Camera,          iconColor: 'text-pink-500',   section: 'admin' },
  adminUsers:   { to: '/admin/users',    icon: Users,           iconColor: 'text-purple-500', section: 'admin' },
  adminRepairs: { to: '/admin/repairs',  icon: Wrench,          iconColor: 'text-orange-500', section: 'admin' },
  adminGroups:  { to: '/admin/groups',   icon: ShieldCheck,     iconColor: 'text-teal-600',   section: 'admin' },
  adminMenus:   { to: '/admin/menus',    icon: ListTree,        iconColor: 'text-indigo-500', section: 'admin' },
  adminAuditLog: { to: '/admin/audit-log', icon: ScrollText,    iconColor: 'text-rose-500',   section: 'admin' },
  adminApi:      { to: '/admin/api',       icon: Plug,          iconColor: 'text-sky-500',    section: 'admin' },
  adminSettings: { to: '/admin/settings',  icon: Settings,      iconColor: 'text-slate-500',  section: 'admin' },
};

export function Sidebar() {
  const { can } = useAuth();
  const [collapsed, setCollapsed] = useState(true);

  // read fresh per render so edits on /admin/menus apply on the next navigation
  const visibleItems = savedMenuSettings()
    .filter(s => s.enabled && can(s.key, 'view'))
    .map(s => ({ ...MENU_CONFIG[s.key], label: s.label, menuKey: s.key }));
  const navItems = visibleItems.filter(i => i.section === 'main');
  const adminItems = visibleItems.filter(i => i.section === 'admin');

  const activeClass = (extra = '') =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-navy-700 border-2 border-navy-700 bg-navy-50 font-bold transition-all ${extra}`;
  const inactiveClass = (extra = '') =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-navy-700 hover:bg-gray-100 font-bold transition-all ${extra}`;

  return (
    <aside
      className="flex flex-col flex-shrink-0 min-h-0 bg-gray-100 border-r border-gray-200 transition-all duration-300"
      style={{ width: collapsed ? '64px' : '240px' }}
    >
      {/* Toggle button */}
      <div className="flex items-center justify-end px-2 pt-3 pb-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-navy-500 hover:text-navy-700 hover:bg-gray-100 transition-colors"
          title={collapsed ? 'ขยายเมนู' : 'ย่อเมนู'}
          aria-label={collapsed ? 'ขยายเมนู' : 'ย่อเมนู'}
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav aria-label="เมนูหลัก" className="flex-1 px-2 space-y-1 overflow-y-auto overflow-x-hidden pb-2">
        {/* Main Menu header */}
        <div className={`pb-1 ${collapsed ? 'flex justify-center pt-1' : 'px-2 pt-1'}`}>
          {collapsed ? (
            <Map size={16} className="text-navy-300" />
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1 border-t border-navy-200" />
              <span className="text-base font-extrabold text-navy-700 uppercase tracking-widest whitespace-nowrap px-1">
                Main Menu
              </span>
              <div className="flex-1 border-t border-navy-200" />
            </div>
          )}
        </div>

        {navItems.map(item => (
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

        {adminItems.length > 0 && (
          <>
            {/* Section header */}
            <div className={`pt-3 pb-1 ${collapsed ? 'flex justify-center' : 'px-2'}`}>
              {collapsed ? (
                <Settings size={16} className="text-navy-300" />
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 border-t border-navy-200" />
                  <span className="text-base font-extrabold text-navy-700 uppercase tracking-widest whitespace-nowrap px-1">
                    จัดการระบบ
                  </span>
                  <div className="flex-1 border-t border-navy-200" />
                </div>
              )}
            </div>

            {adminItems.map(item => (
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
          </>
        )}
      </nav>

      {!collapsed && (
        <div className="px-3 py-3 border-t border-gray-200">
          <p className="text-xs text-navy-400 text-center">อบจ.ชลบุรี © 2568</p>
        </div>
      )}
    </aside>
  );
}
