import type { EventType } from '../types';
import recipientsData from '../data/notificationRecipients.json';
import notificationLogData from '../data/notificationLog.json';

/* ---------- Event types that can trigger a notification ---------- */

export type NotifiableEventType = Exclude<EventType, 'normal'>;
export const NOTIFIABLE_EVENT_TYPES: NotifiableEventType[] = ['traffic', 'gunshot', 'parking', 'flood', 'crowd'];

export type SeverityLevel = 'high' | 'medium' | 'low';
export const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  high: 'สูง',
  medium: 'กลาง',
  low: 'ต่ำ',
};

export type ChannelKey = 'line' | 'email' | 'sms';
export const CHANNEL_LABELS: Record<ChannelKey, string> = {
  line: 'LINE Official',
  email: 'Email (SMTP)',
  sms: 'SMS',
};
export const CHANNEL_KEYS: ChannelKey[] = ['line', 'email', 'sms'];

/* ---------- Notification settings (per event type + channels) ---------- */

export interface EventNotificationRule {
  enabled: boolean;
  severity: SeverityLevel;
  /* แจ้งเตือนด่วน — ส่งทันทีทุกช่องทางโดยไม่รอรอบส่ง */
  urgent: boolean;
  channels: ChannelKey[];
}

export interface ChannelConfig {
  line: { enabled: boolean; token: string };
  email: { enabled: boolean; smtpHost: string; smtpPort: string; sender: string };
  sms: { enabled: boolean; provider: string; senderName: string };
}

export interface NotificationSettings {
  events: Record<NotifiableEventType, EventNotificationRule>;
  channels: ChannelConfig;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  events: {
    traffic: { enabled: true, severity: 'low', urgent: false, channels: ['line'] },
    gunshot: { enabled: true, severity: 'high', urgent: true, channels: ['line', 'email', 'sms'] },
    parking: { enabled: true, severity: 'low', urgent: false, channels: ['line'] },
    flood: { enabled: true, severity: 'high', urgent: true, channels: ['line', 'email', 'sms'] },
    crowd: { enabled: true, severity: 'medium', urgent: false, channels: ['line', 'email'] },
  },
  channels: {
    line: { enabled: true, token: '' },
    email: { enabled: true, smtpHost: 'smtp.chonburi.go.th', smtpPort: '587', sender: 'cctv-alert@chonburi.go.th' },
    sms: { enabled: false, provider: '', senderName: 'CHONBURI-PAO' },
  },
};

const SETTINGS_KEY = 'notification_settings';

/* merge with defaults so fields added in later versions get a value */
export function savedNotificationSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<NotificationSettings>;
    return {
      events: { ...DEFAULT_NOTIFICATION_SETTINGS.events, ...parsed.events },
      channels: { ...DEFAULT_NOTIFICATION_SETTINGS.channels, ...parsed.channels },
    };
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

export function saveNotificationSettings(settings: NotificationSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function resetNotificationSettings(): void {
  localStorage.removeItem(SETTINGS_KEY);
}

/* ---------- Recipients (group or individual user) ---------- */

export interface NotificationRecipient {
  id: string;
  enabled: boolean;
  targetType: 'group' | 'user';
  /* UserGroup.id when targetType = 'group', User.id when 'user' */
  targetId: string;
  channels: ChannelKey[];
  eventTypes: NotifiableEventType[];
}

const RECIPIENTS_KEY = 'notification_recipients';
const RECIPIENT_SEED = recipientsData as NotificationRecipient[];

export function savedRecipients(): NotificationRecipient[] {
  try {
    const raw = localStorage.getItem(RECIPIENTS_KEY);
    if (!raw) return RECIPIENT_SEED;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : RECIPIENT_SEED;
  } catch {
    return RECIPIENT_SEED;
  }
}

export function saveRecipients(recipients: NotificationRecipient[]): void {
  localStorage.setItem(RECIPIENTS_KEY, JSON.stringify(recipients));
}

/* ---------- Notification history (read-only mock) ---------- */

export interface NotificationLogEntry {
  id: string;
  timestamp: string;
  eventType: NotifiableEventType;
  channel: ChannelKey;
  recipient: string;
  message: string;
  status: 'sent' | 'failed';
}

export function savedNotificationLog(): NotificationLogEntry[] {
  return notificationLogData as NotificationLogEntry[];
}
