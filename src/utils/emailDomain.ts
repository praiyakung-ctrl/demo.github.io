/* Catches typo'd email domains (e.g. "gmial.com") at registration by
   checking the domain actually has mail servers, via Google's public
   DNS-over-HTTPS resolver. No API key involved — safe to call from the
   browser. Network failures are treated as "can't verify" rather than
   "invalid", so a flaky connection never blocks a legitimate signup. */

export type DomainCheckResult = 'valid' | 'invalid' | 'unknown';

export async function checkEmailDomain(email: string): Promise<DomainCheckResult> {
  const domain = email.split('@')[1]?.trim();
  if (!domain) return 'invalid';

  try {
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`);
    if (!res.ok) return 'unknown';
    const data = await res.json() as { Answer?: unknown[] };
    return Array.isArray(data.Answer) && data.Answer.length > 0 ? 'valid' : 'invalid';
  } catch {
    return 'unknown';
  }
}
