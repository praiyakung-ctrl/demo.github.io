/* Simulated Google OAuth 2.0 sign-in for the demo (no backend, no client ID).
   To switch to real Google Identity Services:
   1. Create an OAuth Client ID at https://console.cloud.google.com/apis/credentials
   2. Load https://accounts.google.com/gsi/client and call
      google.accounts.oauth2.initTokenClient / google.accounts.id.initialize
   3. Map the returned ID-token claims { sub, email, name, picture } to GoogleProfile
   The rest of the app only consumes GoogleProfile, so nothing else changes. */

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

/* Deterministic-ish mock: unique sub per sign-in so each demo run can register anew */
export function signInWithGoogle(): Promise<GoogleProfile> {
  return new Promise(resolve => {
    setTimeout(() => {
      const n = Math.floor(Math.random() * 900000) + 100000;
      resolve({
        sub: `1084217${n}92731`,
        email: `citizen.demo${n}@gmail.com`,
        name: 'ประชาชน ทดสอบ',
        picture: undefined, // exercise the "รูปโปรไฟล์ (ถ้ามี)" optional case
      });
    }, 800);
  });
}
