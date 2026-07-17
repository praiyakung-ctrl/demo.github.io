# Chonburi CCTV Data Integration Demo

Demo (ไม่มี backend จริง) ระบบฐานข้อมูลเพื่อการเข้าถึงกล้อง CCTV ของ อบจ.ชลบุรี — React 18 + TypeScript + Vite + Tailwind, deploy บน GitHub Pages. UI เป็นภาษาไทยราชการ ฟอนต์ TH Sarabun New ตัวอักษรใหญ่ (text-xl ขึ้นไป) ปี พ.ศ. = `getFullYear() + 543`.

## Commands
- `npm run dev` — dev server
- `npm run build` — `tsc -b && vite build` (ใช้เช็ค type ด้วย)
- `npx vitest run` — unit tests (`src/utils/*.test.ts`)

## Architecture
- **Routing**: `src/App.tsx` — ทุกหน้า lazy-load ยกเว้น LoginPage; `RequireAuth roles={[...]}` ครอบ route; roles: `citizen | operator | executive | admin`
- **หน้า public (ไม่ต้องล็อกอิน)**: `/login` `/register` `/about` `/faq` `/manual` — Navbar มีโหมด guest (ปุ่มเข้าสู่ระบบแทนกระดิ่ง/เมนูผู้ใช้)
- **สองธีมหน้า**:
  - Staff/admin: `Layout` (`src/components/Layout.tsx`) = Navbar + Sidebar + main; header banner ฟ้า + การ์ดเนื้อหา (ดู AdminSettingsPage เป็นแม่แบบฟอร์ม, AdminApiPage เป็นแม่แบบ CRUD table+Modal, AdminAuditLogPage เป็นแม่แบบตาราง filter+export)
  - Citizen: ประกอบเองจาก `CitizenPortalUI.tsx` = `CitizenHero` + `ServiceSidebar` (ซ่อนบน mobile) + `ServiceMenuChips` (แสดงเฉพาะ mobile, `lg:hidden`) + `CitizenFooter` — เพิ่มเมนูประชาชนที่ `MENU` ในไฟล์นี้
- **Persistence**: localStorage ทั้งหมด แพตเทิร์น `savedX()` (อ่าน + merge default/seed + sanitize ค่าเก่า) / `saveX()` ใน `src/utils/*.ts`; seed data ใน `src/data/*.json`
- **ข้อมูลติดต่อ อบจ.**: `src/data/orgInfo.ts` ที่เดียว — อย่า hard-code เบอร์/อีเมล/ที่อยู่ในหน้า

## เพิ่มเมนู admin ใหม่ (MenuKey) — ต้องแก้ครบ 5 ไฟล์ ไม่งั้น type error / เมนูไม่ขึ้น
1. `src/types/index.ts` — `MenuKey` union + `MENU_OPTIONS`
2. `src/components/Sidebar.tsx` — `MENU_CONFIG` (section: `main | admin | backend`)
3. `src/pages/AdminMenusPage.tsx` — `MENU_PATHS`
4. `src/utils/groupStorage.ts` — permissions ของ **ทุกกลุ่ม** ใน `DEFAULT_GROUPS` (เป็น `Record<MenuKey,...>`) + `EMPTY_PERMISSIONS` ใน AdminGroupsPage + fixture ใน groupStorage.test.ts
5. `src/App.tsx` — lazy import + route ครอบ `RequireAuth roles={['admin']}`

`LOCKED_MENUS` (menuStorage.ts) = เมนูที่ปิดไม่ได้; `savedMenuSettings()` merge key ใหม่อัตโนมัติ

## Conventions
- CSS utility classes ใน `src/index.css`: `card` `input-field` `label` `btn-primary` `btn-secondary` `btn-danger`; checkbox ใช้ `accent-[#1b3a6b]`
- สีแบรนด์: `navy-700 #1B3A6B` (primary); event/status colors ใน `src/types/index.ts` (`EVENT_LABELS/EVENT_COLORS`)
- ทุก mutation ฝั่ง admin ต้อง `logAudit(user, action, menu, detail)` (`src/utils/auditLog.ts`)
- Permission gate ใน component: `useAuth().can(menuKey, 'view'|'edit'|'delete')`
- Reusables: `Modal`/`ConfirmDialog`, `Pagination` (PAGE_SIZE=10), `StatusBadge`/`EventBadge`/`RoleBadge`, `ExportButtons`
- **Export PDF**: jsPDF ไม่มีฟอนต์ไทย → ทุก PDF ใช้ html2canvas capture DOM (`src/utils/exportReport.ts`); เอกสารหลายตอนใช้ `exportSectionsToPdf` (ขึ้นหน้าใหม่ต่อ section)
- **High-contrast mode**: มี override ใน index.css (`html.high-contrast ...`) — ใช้สีพื้น `bg-*-50` ใหม่ต้องเพิ่ม override ด้วย
- Accessibility: `SkipLink` + `main id="main-content"` ทุกหน้า, `aria-expanded/aria-current` กับ accordion/เมนู
