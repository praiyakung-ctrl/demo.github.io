import type { Camera } from '../types';

/* mock live feed: dedicated images for specific cameras, otherwise cycle the 8 samples */
const CAMERA_IMAGE_OVERRIDES: Record<string, string> = {
  'CAM-001': 'CCTVCamera002.webp',
  'CAM-003': 'CCTVCamera003.webp',
};

export function cameraImage(cam: Camera): string {
  const override = CAMERA_IMAGE_OVERRIDES[cam.id];
  if (override) return `${import.meta.env.BASE_URL}${override}`;
  const n = ((parseInt(cam.id.slice(4), 10) || 1) - 1) % 8 + 1;
  return `${import.meta.env.BASE_URL}camera${String(n).padStart(3, '0')}.webp`;
}

const DISTRICTS: [string, string, string][] = [
  ['เนินสุธาวาส', 'บ้านสวน / เมืองชลบุรี', 'สภ.เมืองชลบุรี'],
  ['ข้าวหลาม', 'แสนสุข / เมืองชลบุรี', 'สภ.แสนสุข'],
  ['กระทิงลาย', 'นาเกลือ / บางละมุง', 'สภ.เมืองพัทยา'],
  ['คุณพ่อเรย์', 'หนองปรือ / บางละมุง', 'สภ.หนองปรือ'],
  ['สิริกิติ์', 'พลูตาหลวง / สัตหีบ', 'สภ.พลูตาหลวง'],
  ['บางแสน', 'แสนสุข / เมืองชลบุรี', 'สภ.บางแสน'],
  ['หนองมน', 'แสนสุข / เมืองชลบุรี', 'สภ.หนองมน'],
  ['อ่างศิลา', 'อ่างศิลา / เมืองชลบุรี', 'สภ.อ่างศิลา'],
  ['พัทยา', 'หนองปรือ / บางละมุง', 'สภ.หนองปรือ'],
  ['นาเกลือ', 'นาเกลือ / บางละมุง', 'สภ.เมืองพัทยา'],
  ['บางละมุง', 'บางละมุง / บางละมุง', 'สภ.บางละมุง'],
  ['ศรีราชา', 'ศรีราชา / ศรีราชา', 'สภ.ศรีราชา'],
  ['แหลมฉบัง', 'ทุ่งสุขลา / ศรีราชา', 'สภ.แหลมฉบัง'],
  ['เกาะสีชัง', 'ท่าเทววงษ์ / เกาะสีชัง', 'สภ.เกาะสีชัง'],
  ['สัตหีบ', 'สัตหีบ / สัตหีบ', 'สภ.สัตหีบ'],
  ['พลูตาหลวง', 'พลูตาหลวง / สัตหีบ', 'สภ.พลูตาหลวง'],
  ['บ้านบึง', 'บ้านบึง / บ้านบึง', 'สภ.บ้านบึง'],
  ['พนัสนิคม', 'พนัสนิคม / พนัสนิคม', 'สภ.พนัสนิคม'],
  ['พานทอง', 'พานทอง / พานทอง', 'สภ.พานทอง'],
  ['บางปะกง', 'บางปะกง / บางปะกง', 'สภ.บางปะกง'],
  ['หนองใหญ่', 'หนองใหญ่ / หนองใหญ่', 'สภ.หนองใหญ่'],
  ['บ่อทอง', 'บ่อทอง / บ่อทอง', 'สภ.บ่อทอง'],
  ['เกาะจันทร์', 'เกาะจันทร์ / เกาะจันทร์', 'สภ.เกาะจันทร์'],
  ['ชลบุรี', 'บางปลาสร้อย / เมืองชลบุรี', 'สภ.เมืองชลบุรี'],
];

export function districtOf(location: string): string {
  const hit = DISTRICTS.find(([key]) => location.includes(key));
  return hit ? hit[1] : 'จังหวัดชลบุรี';
}

const OTHER_STATION = 'อื่นๆ/ไม่ระบุ สภ.';

/* ระบบไม่มีข้อมูลผูกกล้อง/เหตุการณ์เข้ากับสภ.จริง — แมปจากพื้นที่/ตำบล (key เดียวกับ
   districtOf) ไปยังชื่อ สภ. จริงของจังหวัดชลบุรีโดยตรง ส่วนที่ไม่ match key ใดเลย
   จัดเป็น "อื่นๆ/ไม่ระบุ สภ." */
export function stationOf(location: string): string {
  const hit = DISTRICTS.find(([key]) => location.includes(key));
  return hit ? hit[2] : OTHER_STATION;
}

export const STATION_FILTER_OPTIONS = [...new Set(DISTRICTS.map(d => d[2])), OTHER_STATION];

export function overlayClock(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function downloadCameraSnapshot(cam: Camera): void {
  const a = document.createElement('a');
  a.href = cameraImage(cam);
  a.download = `${cam.id}-snapshot.jpg`;
  a.click();
}

export async function copyCameraShareLink(cam: Camera): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#${cam.id}`);
    return true;
  } catch {
    /* clipboard unavailable (e.g. insecure context) */
    return false;
  }
}
