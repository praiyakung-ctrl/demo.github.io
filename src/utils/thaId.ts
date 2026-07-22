/* Simulated ThaID (DOPA) identity verification for the demo (no backend).
   Real ThaID integration: the relying-party app requests an authorization
   QR code from the ThaID broker (OIDC), the citizen scans it with the ThaID
   mobile app and confirms with PIN/biometric, then the broker redirects back
   with signed claims { national ID, name, ... }. This module fakes that
   whole round trip client-side; the rest of the app only consumes
   ThaIdProfile, so nothing else changes if a real broker is wired in later. */

export interface ThaIdProfile {
  nationalId: string;
  name: string;
  picture?: string;
}

/* 13-digit Thai national ID, format check only (no mod-11 checksum) */
export function isValidNationalId(id: string): boolean {
  return /^[0-9]{13}$/.test(id);
}

/* Simulates "citizen scanned the QR + confirmed in the ThaID app".
   If a nationalId hint is given (e.g. a demo shortcut) it is echoed back;
   otherwise a fresh unused ID is generated so /register can run repeatedly
   in a demo without collisions. */
export function mockThaIdVerify(hint?: Partial<ThaIdProfile>): Promise<ThaIdProfile> {
  return new Promise(resolve => {
    setTimeout(() => {
      const n = Math.floor(Math.random() * 900000000) + 100000000;
      resolve({
        nationalId: hint?.nationalId ?? `31${String(n).padStart(11, '0')}`,
        name: hint?.name ?? 'ประชาชน ทดสอบ',
        picture: hint?.picture,
      });
    }, 3000);
  });
}

export const DEMO_THAID_PROFILES: Record<'admin' | 'operator' | 'executive' | 'citizen', ThaIdProfile> = {
  admin: { nationalId: '1100200000001', name: 'สมศักดิ์ ผู้ดูแล' },
  operator: { nationalId: '1100200000002', name: 'วิภา ควบคุม' },
  executive: { nationalId: '1100200000003', name: 'ธนา บริหาร' },
  citizen: { nationalId: '3100100000001', name: 'ประชาชน ทดสอบ ThaID' },
};
