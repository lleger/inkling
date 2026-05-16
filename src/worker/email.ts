import type { Env } from "./types";

type AuthEmail = {
  to: string;
  subject: string;
  title: string;
  body: string;
  actionText: string;
  actionUrl: string;
};

const DEFAULT_FROM = "Inkling <no-reply@mail.inkling.page>";
const BRAND_ORANGE = "#c2410c";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function sendAuthEmail(env: Env, email: AuthEmail) {
  const actionUrl = escapeHtml(email.actionUrl);
  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f6f4ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f1d1a;">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
      <div style="background:#fffaf1;border:1px solid #e8dcc8;border-radius:16px;padding:28px;">
        <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;">${escapeHtml(email.title)}</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#5f574c;">${escapeHtml(email.body)}</p>
        <a href="${actionUrl}" style="display:inline-block;background:${BRAND_ORANGE};color:white;text-decoration:none;border-radius:10px;padding:11px 16px;font-size:14px;font-weight:600;">${escapeHtml(email.actionText)}</a>
        <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#8a8174;">If the button does not work, paste this link into your browser:<br><a href="${actionUrl}" style="color:${BRAND_ORANGE};">${actionUrl}</a></p>
      </div>
    </div>
  </body>
</html>`;

  await env.EMAIL.send({
    from: env.EMAIL_FROM || DEFAULT_FROM,
    to: email.to,
    subject: email.subject,
    text: `${email.title}\n\n${email.body}\n\n${email.actionText}: ${email.actionUrl}`,
    html,
  });
}
