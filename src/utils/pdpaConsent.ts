const PDPA_CONSENT_KEY = 'pdpa_consent';

export function hasPdpaConsent(): boolean {
  try {
    const raw = localStorage.getItem(PDPA_CONSENT_KEY);
    if (!raw) return false;
    return JSON.parse(raw).accepted === true;
  } catch {
    return false;
  }
}

export function savePdpaConsent(): void {
  localStorage.setItem(
    PDPA_CONSENT_KEY,
    JSON.stringify({ accepted: true, date: new Date().toISOString() })
  );
}
