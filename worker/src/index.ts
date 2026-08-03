/* Cloudflare Worker: transactional email proxy for the Chonburi CCTV demo.
   The React app (static, deployed to GitHub Pages) has nowhere safe to hold
   a Brevo API key, so it calls this Worker instead. The Worker holds the key
   as a secret and builds the email content itself from a fixed set of
   templates — the client only ever sends a `type` + a few plain fields,
   never arbitrary HTML, so this endpoint can't be used as an open relay. */

export interface Env {
  ALLOWED_ORIGIN: string;
  BREVO_SENDER_EMAIL: string;
  BREVO_SENDER_NAME: string;
  BREVO_API_KEY: string;
  APP_LOGIN_URL: string;
}

type EmailRequest =
  | { type: 'member-approved'; to: string; name: string }
  | { type: 'member-rejected'; to: string; name: string; reason: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(body: unknown, status: number, origin: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

function buildEmail(req: EmailRequest, env: Env): { subject: string; html: string } {
  if (req.type === 'member-approved') {
    return {
      subject: 'บัญชีสมาชิกของท่านได้รับการอนุมัติแล้ว',
      html: `
        <p>เรียน คุณ${escapeHtml(req.name)}</p>
        <p>ใบสมัครสมาชิกของท่านได้รับการตรวจสอบและอนุมัติเรียบร้อยแล้ว ท่านสามารถเข้าสู่ระบบเพื่อใช้งานได้ทันที</p>
        <p>ในการเข้าสู่ระบบครั้งแรก ระบบจะให้ท่านตั้งรหัสผ่านสำหรับใช้งานครั้งต่อไป</p>
        <p style="text-align:center;margin:24px 0;">
          <a href="${env.APP_LOGIN_URL}" style="background:#1b3a6b;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">คลิกที่นี่เพื่อเข้าสู่ระบบ</a>
        </p>
        <p>ขอบคุณที่ใช้บริการ<br/>องค์การบริหารส่วนจังหวัดชลบุรี</p>
      `.trim(),
    };
  }
  return {
    subject: 'ใบสมัครสมาชิกของท่านต้องแก้ไขเพิ่มเติม',
    html: `
      <p>เรียน คุณ${escapeHtml(req.name)}</p>
      <p>ใบสมัครสมาชิกของท่านยังไม่สามารถอนุมัติได้ในขณะนี้ ด้วยเหตุผลดังนี้:</p>
      <p style="padding:12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;">${escapeHtml(req.reason)}</p>
      <p>กรุณาสมัครสมาชิกใหม่อีกครั้งพร้อมแนบเอกสารที่ถูกต้องครบถ้วน</p>
      <p>ขอบคุณที่ใช้บริการ<br/>องค์การบริหารส่วนจังหวัดชลบุรี</p>
    `.trim(),
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function isValidRequest(body: unknown): body is EmailRequest {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  if (typeof b.to !== 'string' || !EMAIL_RE.test(b.to)) return false;
  if (typeof b.name !== 'string' || !b.name.trim()) return false;
  if (b.type === 'member-approved') return true;
  if (b.type === 'member-rejected') return typeof b.reason === 'string' && Boolean(b.reason.trim());
  return false;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') ?? '';
    const originAllowed = origin === env.ALLOWED_ORIGIN;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(originAllowed ? origin : env.ALLOWED_ORIGIN) });
    }

    if (!originAllowed) {
      return json({ ok: false, error: 'origin not allowed' }, 403, env.ALLOWED_ORIGIN);
    }

    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/send-email') {
      return json({ ok: false, error: 'not found' }, 404, origin);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: 'invalid JSON body' }, 400, origin);
    }

    if (!isValidRequest(body)) {
      return json({ ok: false, error: 'invalid request fields' }, 400, origin);
    }

    const { subject, html } = buildEmail(body, env);

    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'api-key': env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { email: env.BREVO_SENDER_EMAIL, name: env.BREVO_SENDER_NAME },
        to: [{ email: body.to, name: body.name }],
        subject,
        htmlContent: html,
      }),
    });

    if (!brevoRes.ok) {
      const detail = await brevoRes.text().catch(() => '');
      return json({ ok: false, error: 'email provider rejected the request', detail }, 502, origin);
    }

    return json({ ok: true }, 200, origin);
  },
};
