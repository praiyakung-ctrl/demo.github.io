var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
}
__name(corsHeaders, "corsHeaders");
function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) }
  });
}
__name(json, "json");
function buildEmail(req) {
  if (req.type === "member-approved") {
    return {
      subject: "\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E2A\u0E21\u0E32\u0E0A\u0E34\u0E01\u0E02\u0E2D\u0E07\u0E17\u0E48\u0E32\u0E19\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E41\u0E25\u0E49\u0E27",
      html: `
        <p>\u0E40\u0E23\u0E35\u0E22\u0E19 \u0E04\u0E38\u0E13${escapeHtml(req.name)}</p>
        <p>\u0E43\u0E1A\u0E2A\u0E21\u0E31\u0E04\u0E23\u0E2A\u0E21\u0E32\u0E0A\u0E34\u0E01\u0E02\u0E2D\u0E07\u0E17\u0E48\u0E32\u0E19\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E41\u0E25\u0E30\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27 \u0E17\u0E48\u0E32\u0E19\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E44\u0E14\u0E49\u0E17\u0E31\u0E19\u0E17\u0E35</p>
        <p>\u0E43\u0E19\u0E01\u0E32\u0E23\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E04\u0E23\u0E31\u0E49\u0E07\u0E41\u0E23\u0E01 \u0E23\u0E30\u0E1A\u0E1A\u0E08\u0E30\u0E43\u0E2B\u0E49\u0E17\u0E48\u0E32\u0E19\u0E15\u0E31\u0E49\u0E07\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E04\u0E23\u0E31\u0E49\u0E07\u0E15\u0E48\u0E2D\u0E44\u0E1B</p>
        <p>\u0E02\u0E2D\u0E1A\u0E04\u0E38\u0E13\u0E17\u0E35\u0E48\u0E43\u0E0A\u0E49\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23<br/>\u0E2D\u0E07\u0E04\u0E4C\u0E01\u0E32\u0E23\u0E1A\u0E23\u0E34\u0E2B\u0E32\u0E23\u0E2A\u0E48\u0E27\u0E19\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E0A\u0E25\u0E1A\u0E38\u0E23\u0E35</p>
      `.trim()
    };
  }
  return {
    subject: "\u0E43\u0E1A\u0E2A\u0E21\u0E31\u0E04\u0E23\u0E2A\u0E21\u0E32\u0E0A\u0E34\u0E01\u0E02\u0E2D\u0E07\u0E17\u0E48\u0E32\u0E19\u0E15\u0E49\u0E2D\u0E07\u0E41\u0E01\u0E49\u0E44\u0E02\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E40\u0E15\u0E34\u0E21",
    html: `
      <p>\u0E40\u0E23\u0E35\u0E22\u0E19 \u0E04\u0E38\u0E13${escapeHtml(req.name)}</p>
      <p>\u0E43\u0E1A\u0E2A\u0E21\u0E31\u0E04\u0E23\u0E2A\u0E21\u0E32\u0E0A\u0E34\u0E01\u0E02\u0E2D\u0E07\u0E17\u0E48\u0E32\u0E19\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E44\u0E14\u0E49\u0E43\u0E19\u0E02\u0E13\u0E30\u0E19\u0E35\u0E49 \u0E14\u0E49\u0E27\u0E22\u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25\u0E14\u0E31\u0E07\u0E19\u0E35\u0E49:</p>
      <p style="padding:12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;">${escapeHtml(req.reason)}</p>
      <p>\u0E01\u0E23\u0E38\u0E13\u0E32\u0E2A\u0E21\u0E31\u0E04\u0E23\u0E2A\u0E21\u0E32\u0E0A\u0E34\u0E01\u0E43\u0E2B\u0E21\u0E48\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E41\u0E19\u0E1A\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23\u0E17\u0E35\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E04\u0E23\u0E1A\u0E16\u0E49\u0E27\u0E19</p>
      <p>\u0E02\u0E2D\u0E1A\u0E04\u0E38\u0E13\u0E17\u0E35\u0E48\u0E43\u0E0A\u0E49\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23<br/>\u0E2D\u0E07\u0E04\u0E4C\u0E01\u0E32\u0E23\u0E1A\u0E23\u0E34\u0E2B\u0E32\u0E23\u0E2A\u0E48\u0E27\u0E19\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E0A\u0E25\u0E1A\u0E38\u0E23\u0E35</p>
    `.trim()
  };
}
__name(buildEmail, "buildEmail");
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
__name(escapeHtml, "escapeHtml");
function isValidRequest(body) {
  if (!body || typeof body !== "object") return false;
  const b = body;
  if (typeof b.to !== "string" || !EMAIL_RE.test(b.to)) return false;
  if (typeof b.name !== "string" || !b.name.trim()) return false;
  if (b.type === "member-approved") return true;
  if (b.type === "member-rejected") return typeof b.reason === "string" && Boolean(b.reason.trim());
  return false;
}
__name(isValidRequest, "isValidRequest");
var index_default = {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") ?? "";
    const originAllowed = origin === env.ALLOWED_ORIGIN;
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(originAllowed ? origin : env.ALLOWED_ORIGIN) });
    }
    if (!originAllowed) {
      return json({ ok: false, error: "origin not allowed" }, 403, env.ALLOWED_ORIGIN);
    }
    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/send-email") {
      return json({ ok: false, error: "not found" }, 404, origin);
    }
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: "invalid JSON body" }, 400, origin);
    }
    if (!isValidRequest(body)) {
      return json({ ok: false, error: "invalid request fields" }, 400, origin);
    }
    const { subject, html } = buildEmail(body);
    const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "api-key": env.BREVO_API_KEY
      },
      body: JSON.stringify({
        sender: { email: env.BREVO_SENDER_EMAIL, name: env.BREVO_SENDER_NAME },
        to: [{ email: body.to, name: body.name }],
        subject,
        htmlContent: html
      })
    });
    if (!brevoRes.ok) {
      const detail = await brevoRes.text().catch(() => "");
      return json({ ok: false, error: "email provider rejected the request", detail }, 502, origin);
    }
    return json({ ok: true }, 200, origin);
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
