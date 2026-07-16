import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Map, LayoutDashboard, FileText, BarChart3, Camera, Users, ChevronLeft, ChevronRight, Settings, ShieldCheck, Wrench } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { MenuKey } from '../types';

/* Menu visibility is driven by the user's group permissions (see groupStorage);
   the system groups reproduce the old hardcoded role behavior. */
const navItems: { to: string; icon: typeof Map; label: string; iconColor: string; menuKey: MenuKey }[] = [
  { to: '/map',       icon: Map,             label: 'แผนที่กล้อง', iconColor: 'text-cyan-500',  menuKey: 'map' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',   iconColor: 'text-blue-600',  menuKey: 'dashboard' },
  { to: '/portal',    icon: FileText,        label: 'ยื่นขอกล้อง', iconColor: 'text-green-600', menuKey: 'portal' },
  { to: '/reports',   icon: BarChart3,       label: 'รายงาน',      iconColor: 'text-amber-500', menuKey: 'reports' },
];

const adminItems: { to: string; icon: typeof Map; label: string; iconColor: string; menuKey: MenuKey }[] = [
  { to: '/admin/cameras', icon: Camera,      label: 'จัดการกล้อง',       iconColor: 'text-pink-500',   menuKey: 'adminCameras' },
  { to: '/admin/users',   icon: Users,       label: 'จัดการผู้ใช้',       iconColor: 'text-purple-500', menuKey: 'adminUsers' },
  { to: '/admin/repairs', icon: Wrench,      label: 'กล้องรอตรวจสอบ',    iconColor: 'text-orange-500', menuKey: 'adminRepairs' },
  { to: '/admin/groups',  icon: ShieldCheck, label: 'จัดการกลุ่มสิทธิ์', iconColor: 'text-teal-600',   menuKey: 'adminGroups' },
];

export function Sidebar() {
  const { can } = useAuth();
  const [collapsed, setCollapsed] = useState(true);

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

        {navItems
          .filter(item => can(item.menuKey, 'view'))
          .map(item => (
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

        {adminItems.some(i => can(i.menuKey, 'view')) && (
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

            {adminItems
              .filter(item => can(item.menuKey, 'view'))
              .map(item => (
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
