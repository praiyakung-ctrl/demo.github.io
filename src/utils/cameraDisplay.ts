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

const DISTRICTS: [string, string][] = [
  ['เนินสุธาวาส', 'บ้านสวน / เมืองชลบุรี'],
  ['ข้าวหลาม', 'แสนสุข / เมืองชลบุรี'],
  ['กระทิงลาย', 'นาเกลือ / บางละมุง'],
  ['คุณพ่อเรย์', 'หนองปรือ / บางละมุง'],
  ['สิริกิติ์', 'พลูตาหลวง / สัตหีบ'],
  ['บางแสน', 'แสนสุข / เมืองชลบุรี'],
  ['หนองมน', 'แสนสุข / เมืองชลบุรี'],
  ['อ่างศิลา', 'อ่างศิลา / เมืองชลบุรี'],
  ['พัทยา', 'หนองปรือ / บางละมุง'],
  ['นาเกลือ', 'นาเกลือ / บางละมุง'],
  ['บางละมุง', 'บางละมุง / บางละมุง'],
  ['ศรีราชา', 'ศรีราชา / ศรีราชา'],
  ['แหลมฉบัง', 'ทุ่งสุขลา / ศรีราชา'],
  ['เกาะสีชัง', 'ท่าเทววงษ์ / เกาะสีชัง'],
  ['สัตหีบ', 'สัตหีบ / สัตหีบ'],
  ['พลูตาหลวง', 'พลูตาหลวง / สัตหีบ'],
  ['บ้านบึง', 'บ้านบึง / บ้านบึง'],
  ['พนัสนิคม', 'พนัสนิคม / พนัสนิคม'],
  ['พานทอง', 'พานทอง / พานทอง'],
  ['บางปะกง', 'บางปะกง / บางปะกง'],
  ['หนองใหญ่', 'หนองใหญ่ / หนองใหญ่'],
  ['บ่อทอง', 'บ่อทอง / บ่อทอง'],
  ['เกาะจันทร์', 'เกาะจันทร์ / เกาะจันทร์'],
  ['ชลบุรี', 'บางปลาสร้อย / เมืองชลบุรี'],
];

export function districtOf(location: string): string {
  const hit = DISTRICTS.find(([key]) => location.includes(key));
  return hit ? hit[1] : 'จังหวัดชลบุรี';
}

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
