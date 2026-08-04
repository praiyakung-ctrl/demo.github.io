/* Client for the Cloudflare Worker email proxy (see worker/README.md).
   The Worker holds the Brevo API key server-side; this file never touches
   any credential. If VITE_EMAIL_WORKER_URL isn't configured (e.g. local
   dev before the Worker is deployed) sends are skipped rather than throwing,
   so the rest of the app keeps working — callers should still record the
   attempt via logAudit for a visible trail. */

const WORKER_URL = import.meta.env.VITE_EMAIL_WORKER_URL as string | undefined;

async function send(body: Record<string, unknown>): Promise<boolean> {
  if (!WORKER_URL) return false;
  try {
    const res = await fetch(`${WORKER_URL}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function sendApprovalEmail(to: string, name: string): Promise<boolean> {
  return send({ type: 'member-approved', to, name });
}

export function sendRejectionEmail(to: string, name: string, reason: string): Promise<boolean> {
  return send({ type: 'member-rejected', to, name, reason });
}

export function sendSubmittedEmail(to: string, name: string): Promise<boolean> {
  return send({ type: 'member-submitted', to, name });
}

export function sendOtpEmail(to: string, code: string): Promise<boolean> {
  return send({ type: 'otp', to, code });
}

export function sendCctvApprovalPendingEmail(to: string, name: string, reqNo: string, level: 1 | 2 | 3): Promise<boolean> {
  return send({ type: 'cctv-approval-pending', to, name, reqNo, level });
}

export function sendCctvRequestApprovedEmail(to: string, name: string, reqNo: string): Promise<boolean> {
  return send({ type: 'cctv-request-approved', to, name, reqNo });
}

export function sendCctvRequestRejectedEmail(to: string, name: string, reason: string): Promise<boolean> {
  return send({ type: 'cctv-request-rejected', to, name, reason });
}

export function sendCctvVideoReadyEmail(to: string, name: string, reqNo: string, magicLink: string, fileCount: number): Promise<boolean> {
  return send({ type: 'cctv-video-ready', to, name, reqNo, magicLink, fileCount });
}
