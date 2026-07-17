/* ข้อมูลติดต่อ อบจ.ชลบุรี — จุดเดียวที่ใช้ร่วมกันทั้งหน้า About / FAQ / คู่มือ / การ์ดติดต่อ */
export const ORG_INFO = {
  nameTh: 'องค์การบริหารส่วนจังหวัดชลบุรี',
  nameEn: 'CHONBURI PROVINCIAL ADMINISTRATIVE ORGANIZATION',
  address: '333/555 หมู่ที่ 3 ถนนนารถมนตเสวี 1 ตำบลเสม็ด อำเภอเมืองชลบุรี จังหวัดชลบุรี 20000',
  phones: ['038-398-038', '038-398-039', '038-398-040', '038-398-041', '038-398-042', '038-398-043'],
  fax: '038-398-036',
  email: 'saraban@chon.go.th',
  /* เบอร์ติดต่อเจ้าหน้าที่สำหรับบริการประชาชน */
  hotline: '038-398-333',
  officeHours: 'จันทร์ - ศุกร์ 08:30 - 16:30 น.',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('องค์การบริหารส่วนจังหวัดชลบุรี'),
} as const;
