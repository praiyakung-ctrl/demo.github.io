# Email API Worker

A small Cloudflare Worker that proxies transactional email sends to [Brevo](https://www.brevo.com/). It exists because the main app is a static site on GitHub Pages with no server — this Worker is the only place the Brevo API key is allowed to live.

The Worker only accepts two fixed email "types" (`member-approved`, `member-rejected`) and builds the email content itself — the browser never sends arbitrary HTML, so this endpoint can't be abused as a generic mail relay even though it's public.

## One-time setup (do this yourself — needs your Cloudflare/Brevo accounts)

1. **Cloudflare account + login**
   ```
   cd worker
   npm install
   npx wrangler login
   ```

2. **Brevo account**
   - Sign up at https://www.brevo.com/
   - Under *Senders & IP* → verify the sender email/domain you intend to send from (Brevo will reject sends from unverified senders).
   - Get an API key under *SMTP & API* → *API Keys*.

3. **Configure `wrangler.toml`**
   - Set `ALLOWED_ORIGIN` to your deployed GitHub Pages URL (no trailing slash) — this is the only origin allowed to call the Worker.
   - Set `BREVO_SENDER_EMAIL` / `BREVO_SENDER_NAME` to the sender you verified in Brevo.

4. **Set the secret** (never put this in `wrangler.toml` or commit it)
   ```
   npx wrangler secret put BREVO_API_KEY
   ```
   Paste your Brevo API key when prompted.

5. **Deploy**
   ```
   npx wrangler deploy
   ```
   Wrangler prints the Worker's URL, e.g. `https://chonburi-cctv-email-api.<your-subdomain>.workers.dev`.

6. **Wire the front-end to it**
   - In the main app's `.env` (or the GitHub Actions build step), set:
     ```
     VITE_EMAIL_WORKER_URL=https://chonburi-cctv-email-api.<your-subdomain>.workers.dev
     ```
   - This URL is not secret — it's fine to bake into the public JS bundle. Only `BREVO_API_KEY` (step 4) must stay server-side.

## Local development

```
npx wrangler dev
```
This runs the Worker locally. `fetch` calls to Brevo still go out to the real API, so use a Brevo test/sandbox key if you don't want to send real mail while developing.

## Endpoint

`POST /send-email`

```jsonc
// approval
{ "type": "member-approved", "to": "someone@example.com", "name": "สมชาย ใจดี" }

// rejection
{ "type": "member-rejected", "to": "someone@example.com", "name": "สมชาย ใจดี", "reason": "เอกสารไม่ครบถ้วน" }
```

Requests are only accepted from the exact `Origin` configured as `ALLOWED_ORIGIN`.
