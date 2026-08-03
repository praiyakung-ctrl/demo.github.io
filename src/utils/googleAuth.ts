/* Simulated Google OAuth 2.0 sign-in for the demo (no backend).
   Real integration: the app redirects to Google's OAuth consent screen,
   the user signs in with Gmail and approves the requested scopes, then
   Google redirects back with an authorization code the server exchanges
   for an ID token containing { email, name, picture }. This module fakes
   that whole round trip client-side; the rest of the app only consumes
   GoogleProfile, so nothing else changes if a real OAuth client is wired
   in later. Used for foreign-national registration (no Thai national ID),
   paired with a passport scan attached during registration. */

export interface GoogleProfile {
  email: string;
  name: string;
  picture?: string;
}

/* Simulates "user signed in with Gmail and approved the consent screen".
   If an email hint is given (e.g. a demo shortcut) it is echoed back;
   otherwise a fresh unused address is generated so /register/foreigner
   can run repeatedly in a demo without collisions. */
export function mockGoogleVerify(hint?: Partial<GoogleProfile>): Promise<GoogleProfile> {
  return new Promise(resolve => {
    setTimeout(() => {
      const n = Math.floor(Math.random() * 900000) + 100000;
      resolve({
        email: hint?.email ?? `foreign.visitor.${n}@gmail.com`,
        name: hint?.name ?? 'Foreign Visitor',
        picture: hint?.picture,
      });
    }, 2000);
  });
}

export const DEMO_GOOGLE_PROFILE: GoogleProfile = {
  email: 'zhang.san.demo@gmail.com',
  name: 'ZHANG SAN',
};
