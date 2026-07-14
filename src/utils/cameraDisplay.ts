import type { Camera } from '../types';

/* mock live feed: dedicated images for specific cameras, otherwise cycle the 8 samples */
const CAMERA_IMAGE_OVERRIDES: Record<string, string> = {
  'CAM-001': 'CCTVCamera002.png',
  'CAM-003': 'CCTVCamera003.png',
};

export function cameraImage(cam: Camera): string {
  const override = CAMERA_IMAGE_OVERRIDES[cam.id];
  if (override) return `${import.meta.env.BASE_URL}${override}`;
  const n = ((parseInt(cam.id.slice(4), 10) || 1) - 1) % 8 + 1;
  return `${import.meta.env.BASE_URL}camera${String(n).padStart(3, '0')}.jpg`;
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
  ['ศรีราชา', 'ศรีราชา / ศรีราชา'],
  ['แหลมฉบัง', 'ทุ่งสุขลา / ศรีราชา'],
  ['สัตหีบ', 'สัตหีบ / สัตหีบ'],
  ['พลูตาหลวง', 'พลูตาหลวง / สัตหีบ'],
  ['บ้านบึง', 'บ้านบึง / บ้านบึง'],
  ['พนัสนิคม', 'พนัสนิคม / พนัสนิคม'],
  ['พานทอง', 'พานทอง / พานทอง'],
  ['บางปะกง', 'บางปะกง / บางปะกง'],
  ['ชลบุรี', 'บางปลาสร้อย / เมืองชลบุรี'],
];

export function districtOf(location: string): string {
  const hit = DISTRICTS.find(([key]) => location.includes(key));
  return hit ? hit[1] : 'จังหวัดชลบุรี';
}
