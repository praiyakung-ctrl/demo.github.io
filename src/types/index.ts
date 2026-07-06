export type EventType = 'traffic' | 'gunshot' | 'parking' | 'flood' | 'crowd' | 'normal';
export type CameraStatus = 'Online' | 'Offline';
export type CameraType = 'Fixed' | 'PTZ';
export type UserRole = 'admin' | 'operator' | 'executive' | 'citizen';
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
  cameraId: string;
  cameraLocation: string;
  startDatetime: string;
  endDatetime: string;
  purpose: string;
  description: string;
  status: RequestStatus;
  submittedAt: string;
  staffId?: string;
  videoFile?: string;
  timeline: TimelineEntry[];
}

export interface TimelineEntry {
  step: string;
  timestamp?: string;
  completed: boolean;
}

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  email: string;
  isActive: boolean;
  password?: string;
}

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

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'ผู้ดูแลระบบ',
  operator: 'เจ้าหน้าที่ควบคุม',
  executive: 'ผู้บริหาร',
  citizen: 'ประชาชน',
};
