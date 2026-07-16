export interface SystemSettings {
  videoRetentionDays: number;
  logRetentionDays: number;
  sessionTimeoutMinutes: number;
  pdpaConsentText: string;
}

export const DEFAULT_SETTINGS: SystemSettings = {
  videoRetentionDays: 30,
  logRetentionDays: 90,
  sessionTimeoutMinutes: 30,
  pdpaConsentText:
    'ระบบนี้มีการเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลของท่าน ได้แก่ ชื่อ-นามสกุล ข้อมูลติดต่อ และภาพจากกล้องวงจรปิด ' +
    'เพื่อวัตถุประสงค์ด้านความปลอดภัยสาธารณะ และปฏิบัติตามกฎหมายที่เกี่ยวข้อง ' +
    'ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)',
};

const SETTINGS_KEY = 'system_settings';

/* merge with defaults so fields added in later versions get a value */
export function savedSystemSettings(): SystemSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSystemSettings(settings: SystemSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function resetSystemSettings(): void {
  localStorage.removeItem(SETTINGS_KEY);
}
