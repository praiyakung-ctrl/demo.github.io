export type EventType = 'traffic' | 'gunshot' | 'parking' | 'flood' | 'crowd' | 'normal';
export type CameraStatus = 'Online' | 'Offline';
export type CameraType = 'Fixed' | 'PTZ';
export type UserRole = 'admin' | 'operator' | 'executive' | 'citizen' | 'police' | 'localOfficer';
export type RequestStatus = 'ใหม่' | 'รอดำเนินการ' | 'รอภาพ' | 'อนุมัติ' | 'ส่งแล้ว' | 'ได้รับแล้ว' | 'ปฏิเสธ';

export interface Camera {
  id: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
  type: CameraType;
  organization: string;
  rtspUrl: string;
  status: CameraStatus;
  direction: string;
  lastUpdate: string;
  currentEvent: EventType;
  /* NT MPLS link bandwidth per camera */
  lprMbps: number;
  unityMbps: number;
  /* shown on the public home page (no login required) when true; omitted/false stays internal-only */
  isPublic?: boolean;
  /* device info shown on the Live Viewer detail panel */
  brand?: string;
  model?: string;
  resolution?: string;
  /* lens/pan angle in degrees — distinct from `direction` (compass heading) */
  angle?: number;
  signalQuality?: 'ดีเยี่ยม' | 'ดี' | 'พอใช้' | 'ไม่มีสัญญาณ';
}

export interface CctvEvent {
  id: string;
  cameraId: string;
  cameraName: string;
  eventType: EventType;
  timestamp: string;
  source: 'api' | 'manual';
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  actionNote?: string;
  isAcknowledged: boolean;
}

export interface MonthlyEventData {
  month: string;
  traffic: number;
  gunshot: number;
  parking: number;
  flood: number;
  crowd: number;
  other: number;
}

export interface LprRoad {
  road: string;
  count: number;
  trend: number;
}

export interface LprEntry {
  id: string;
  plate: string;
  road: string;
  cameraId: string;
  timestamp: string;
  confidence: number;
}

export interface CitizenRequest {
  id: string;
  reqNo: string;
  citizenName: string;
  idCard: string;
  phone: string;
  email: string;
  /* citizen-pinned incident location — no camera data is ever shown to citizens */
  incidentLat: number;
  incidentLng: number;
  incidentLocation: string;
  /* populated by staff after reviewing the pin; empty until reviewed */
  assignedCameraIds: string[];
  startDatetime: string;
  endDatetime: string;
  purpose: string;
  description: string;
  status: RequestStatus;
  submittedAt: string;
  staffId?: string;
  videoFile?: string;
  /* required when status is 'ปฏิเสธ' */
  rejectionReason?: string;
  /* ISO date; citizen can download the video until this expires */
  videoExpiresAt?: string;
  timeline: TimelineEntry[];
}

export interface TimelineEntry {
  step: string;
  timestamp?: string;
  completed: boolean;
}

/* ---------- Police stations (สภ.) — for the police-usage KPI report ---------- */

export const POLICE_STATION_OPTIONS = [
  'สภ.เมืองชลบุรี', 'สภ.บางละมุง', 'สภ.ศรีราชา', 'สภ.พนัสนิคม', 'สภ.บ้านบึง', 'สภ.สัตหีบ',
] as const;

export const POLICE_AREA_GROUPS = ['เขตเมือง', 'เขตชายฝั่งทะเล', 'เขตอุตสาหกรรม'] as const;

export const POLICE_STATION_AREA: Record<string, string> = {
  'สภ.เมืองชลบุรี': 'เขตเมือง',
  'สภ.พนัสนิคม': 'เขตเมือง',
  'สภ.บ้านบึง': 'เขตเมือง',
  'สภ.บางละมุง': 'เขตชายฝั่งทะเล',
  'สภ.สัตหีบ': 'เขตชายฝั่งทะเล',
  'สภ.ศรีราชา': 'เขตอุตสาหกรรม',
};

/* ---------- "แจ้งเหตุ" — police risk points / local-officer proposed install points ---------- */

export type IncidentPointType = 'risk' | 'proposed';
export type IncidentPointStatus = 'pending' | 'approved' | 'rejected';

export const INCIDENT_STATUS_LABEL: Record<IncidentPointStatus, string> = {
  pending: 'รอตรวจสอบ',
  approved: 'อนุมัติ',
  rejected: 'ปฏิเสธ',
};

export const INCIDENT_CATEGORY_OPTIONS = [
  'อุบัติเหตุทางถนน', 'อาชญากรรม', 'จุดเสี่ยงน้ำท่วม', 'จุดเสี่ยงไฟไหม้', 'อื่นๆ',
] as const;

export const INCIDENT_FREQUENCY_OPTIONS = [
  'ครั้งแรก', 'เป็นครั้งคราว (1-2 ครั้ง/เดือน)', 'บ่อย (มากกว่า 3 ครั้ง/เดือน)',
] as const;

export interface IncidentPoint {
  id: string;
  /* 'risk' = จุดเสี่ยงภัย ปักโดยตำรวจ (แดง); 'proposed' = จุดขอติดตั้งใหม่ ปักโดยเจ้าหน้าที่ท้องถิ่น (เหลือง) */
  type: IncidentPointType;
  lat: number;
  lng: number;
  locationLabel: string;
  category: string;
  frequency: string;
  description: string;
  /* required when type === 'proposed' */
  installReason?: string;
  /* photo as data-URI (demo), optional */
  photo?: string;
  submittedBy: string;
  submittedByUserId: string;
  submittedAt: string;
  status: IncidentPointStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  /* required when status === 'rejected' */
  rejectionReason?: string;
}

export type MemberType = 'ประชาชน' | 'นิติบุคคล' | 'หน่วยงานราชการ' | 'บริษัทประกัน' | 'ทนายความ' | 'อื่นๆ';

export const MEMBER_TYPE_OPTIONS: MemberType[] = [
  'ประชาชน', 'นิติบุคคล', 'หน่วยงานราชการ', 'บริษัทประกัน', 'ทนายความ', 'อื่นๆ',
];

export const MEMBER_PURPOSE_OPTIONS = [
  'ขอภาพเพื่อดำเนินคดี',
  'เคลมประกันภัย',
  'ใช้เป็นหลักฐาน',
  'อื่นๆ',
] as const;

/* Citizen who registered through ThaID verification on the register page */
export interface CitizenMember {
  id: string;
  nationalId: string;
  email: string;
  name: string;
  picture?: string;
  address: string;
  province: string;
  postalCode: string;
  phone: string;
  memberType: MemberType;
  purpose: string;
  acceptedTerms: boolean;
  acceptedPdpa: boolean;
  registeredAt: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  email: string;
  isActive: boolean;
  /* 13-digit Thai national ID — the credential ThaID/DOPA verifies against */
  nationalId: string;
  /* group-based permissions; when absent, falls back to the system group of the role */
  groupId?: string;
  phone?: string;
  /* profile photo as data-URI (demo) */
  picture?: string;
  department?: string;
  note?: string;
}

/* ---------- Group-based permissions (RBAC) ---------- */

export type MenuKey =
  | 'map' | 'dashboard' | 'portal' | 'reports' | 'liveViewer' | 'comparisonReport'
  | 'adminCameras' | 'adminUsers' | 'adminRepairs' | 'adminGroups' | 'adminMenus'
  | 'adminAuditLog' | 'adminApi' | 'adminNotifications' | 'adminSettings' | 'adminIncidents';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

export interface UserGroup {
  id: string;
  name: string;
  description: string;
  /* system groups mirror the built-in roles: permissions editable, not deletable */
  isSystem: boolean;
  permissions: Record<MenuKey, PermissionAction[]>;
}

export const MENU_OPTIONS: { key: MenuKey; label: string }[] = [
  { key: 'map',          label: 'แผนที่กล้อง' },
  { key: 'dashboard',    label: 'Dashboard' },
  { key: 'portal',       label: 'ยื่นขอกล้อง (พอร์ทัลประชาชน)' },
  { key: 'reports',      label: 'รายงาน' },
  { key: 'liveViewer',   label: 'Live Viewer (หมุนเวียนภาพกล้อง)' },
  { key: 'comparisonReport', label: 'รายงานเปรียบเทียบ' },
  { key: 'adminCameras', label: 'จัดการกล้อง' },
  { key: 'adminUsers',   label: 'จัดการผู้ใช้' },
  { key: 'adminRepairs', label: 'กล้องรอตรวจสอบ' },
  { key: 'adminGroups',  label: 'จัดการกลุ่มและสิทธิ์' },
  { key: 'adminMenus',   label: 'จัดการเมนู' },
  { key: 'adminAuditLog', label: 'ประวัติการใช้งานระบบ' },
  { key: 'adminApi',      label: 'จัดการการเชื่อมต่อ API' },
  { key: 'adminNotifications', label: 'จัดการการแจ้งเตือน' },
  { key: 'adminSettings', label: 'ตั้งค่าระบบ' },
  { key: 'adminIncidents', label: 'ตรวจสอบจุดแจ้งเหตุ' },
];

/* Per-menu presentation settings managed on /admin/menus */
export interface MenuSetting {
  key: MenuKey;
  label: string;
  order: number;
  enabled: boolean;
}

export const ACTION_OPTIONS: { key: PermissionAction; label: string }[] = [
  { key: 'view',   label: 'ดู' },
  { key: 'create', label: 'เพิ่ม' },
  { key: 'edit',   label: 'แก้ไข' },
  { key: 'delete', label: 'ลบ' },
];

export const EVENT_LABELS: Record<EventType, string> = {
  traffic: 'รถติด',
  gunshot: 'เสียงปืน',
  parking: 'จอดรถผิดกฎหมาย',
  flood: 'น้ำท่วม',
  crowd: 'มีผู้ชุมนุม',
  normal: 'ปกติ',
};

export const EVENT_COLORS: Record<EventType, string> = {
  traffic: '#F97316',
  gunshot: '#EF4444',
  parking: '#92400E',
  flood: '#3B82F6',
  crowd: '#EAB308',
  normal: '#22C55E',
};

/* Darker shades that pass WCAG AA (>= 4.5:1) when used as text on white —
   EVENT_COLORS stays for fills/backgrounds where white text sits on top. */
export const EVENT_TEXT_COLORS: Record<EventType, string> = {
  traffic: '#C2410C',
  gunshot: '#DC2626',
  parking: '#92400E',
  flood: '#1D4ED8',
  crowd: '#A16207',
  normal: '#15803D',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'ผู้ดูแลระบบ',
  operator: 'เจ้าหน้าที่ควบคุม',
  executive: 'ผู้บริหาร',
  citizen: 'ประชาชน',
  police: 'ตำรวจ',
  localOfficer: 'เจ้าหน้าที่ท้องถิ่น',
};
