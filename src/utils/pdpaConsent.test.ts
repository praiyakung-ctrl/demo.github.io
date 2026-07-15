import { beforeEach, describe, expect, it } from 'vitest';
import { hasPdpaConsent, savePdpaConsent } from './pdpaConsent';

describe('pdpaConsent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns false when no consent is stored', () => {
    expect(hasPdpaConsent()).toBe(false);
  });

  it('returns false when stored value is not valid JSON', () => {
    localStorage.setItem('pdpa_consent', 'not-json{');
    expect(hasPdpaConsent()).toBe(false);
  });

  it('returns false when accepted is not true', () => {
    localStorage.setItem('pdpa_consent', JSON.stringify({ accepted: false }));
    expect(hasPdpaConsent()).toBe(false);
  });

  it('returns true after savePdpaConsent', () => {
    savePdpaConsent();
    expect(hasPdpaConsent()).toBe(true);
  });

  it('saves accepted flag with an ISO date', () => {
    savePdpaConsent();
    const saved = JSON.parse(localStorage.getItem('pdpa_consent')!);
    expect(saved.accepted).toBe(true);
    expect(new Date(saved.date).toISOString()).toBe(saved.date);
  });
});
