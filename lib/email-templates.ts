// Shared HTML builders for every outbound email in the app (OTP codes,
// account-change notices, welcome emails) — kept separate from lib/email.ts
// (a pure n8n transport wrapper) so the actual presentation lives in one
// place instead of being duplicated per call site.
//
// Table-based layout + inline styles throughout, deliberately — email
// clients (Outlook in particular) don't reliably support flexbox/grid or
// external/`<style>` CSS, so this sticks to the lowest-common-denominator
// patterns that render consistently everywhere.

const BRAND_GRADIENT = "background-color:#4f46e5;background-image:linear-gradient(135deg,#4f46e5,#6366f1);";
const FONT_STACK = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function emailLayout(input: { preheader: string; icon: string; heading: string; bodyHtml: string }): string {
  return `<!doctype html>
<html>
  <head><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
  <body style="margin:0;padding:0;background-color:#f4f4f7;font-family:${FONT_STACK};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(15,23,42,0.08);">
            <tr>
              <td style="${BRAND_GRADIENT}padding:32px 32px 28px;text-align:center;">
                <div style="font-size:36px;line-height:1;margin-bottom:10px;">${input.icon}</div>
                <div style="color:#ffffff;font-size:17px;font-weight:700;letter-spacing:0.4px;font-family:${FONT_STACK};">HR PLATFORM</div>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px 8px;">
                <h1 style="margin:0 0 18px;font-size:21px;font-weight:700;color:#111827;font-family:${FONT_STACK};">${escapeHtml(input.heading)}</h1>
                ${input.bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px;">
                <div style="border-top:1px solid #eef0f4;padding-top:20px;">
                  <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;font-family:${FONT_STACK};text-align:center;">
                    This is an automated message from HR Platform. If you weren't expecting it, you can safely ignore it.
                  </p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 18px;font-size:15px;color:#4b5563;line-height:1.65;font-family:${FONT_STACK};">${text}</p>`;
}

export function otpCodeEmailHtml(input: { userName: string; code: string; purpose?: string }): string {
  const purpose = input.purpose ?? "verify your email address";
  const bodyHtml = `
    ${paragraph(`Hi ${escapeHtml(input.userName)}, use the code below to ${escapeHtml(purpose)}.`)}
    <div style="margin:0 0 20px;padding:24px;background-color:#eef2ff;border-radius:12px;text-align:center;">
      <span style="font-size:34px;font-weight:800;letter-spacing:10px;color:#4338ca;font-family:'Courier New',Courier,monospace;">${escapeHtml(input.code)}</span>
    </div>
    <p style="margin:0 0 4px;font-size:13px;color:#6b7280;line-height:1.6;font-family:${FONT_STACK};">⏱️ This code expires in <strong>15 minutes</strong>.</p>
    <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;font-family:${FONT_STACK};">🔒 Never share this code with anyone — not even someone claiming to be from our team.</p>
  `;
  return emailLayout({
    preheader: `Your verification code is ${input.code}`,
    icon: "🔐",
    heading: "Verify your email",
    bodyHtml,
  });
}

export function emailChangeAdminNoticeHtml(input: {
  actorName: string;
  companyName: string;
  oldEmail: string;
  newEmail: string;
}): string {
  const bodyHtml = `
    ${paragraph(
      `<strong>${escapeHtml(input.actorName)}</strong> changed their login email at <strong>${escapeHtml(input.companyName)}</strong>.`,
    )}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;background-color:#f9fafb;border-radius:12px;">
      <tr>
        <td style="padding:16px 20px;font-size:14px;color:#6b7280;font-family:${FONT_STACK};">Previous email</td>
        <td style="padding:16px 20px;font-size:14px;color:#111827;font-weight:600;text-align:right;font-family:${FONT_STACK};">${escapeHtml(input.oldEmail)}</td>
      </tr>
      <tr>
        <td style="padding:0 20px 16px;font-size:14px;color:#6b7280;font-family:${FONT_STACK};">New email</td>
        <td style="padding:0 20px 16px;font-size:14px;color:#111827;font-weight:600;text-align:right;font-family:${FONT_STACK};">${escapeHtml(input.newEmail)}</td>
      </tr>
    </table>
  `;
  return emailLayout({
    preheader: `${input.actorName} changed their login email`,
    icon: "🔔",
    heading: "Email change notice",
    bodyHtml,
  });
}

export function welcomeEmailHtml(input: {
  recipientName: string;
  companyName: string;
  companySlug: string;
  email: string;
  tempPassword: string;
}): string {
  const row = (label: string, value: string, isLast = false) => `
    <tr>
      <td style="padding:14px 20px;${isLast ? "" : "border-bottom:1px solid #e5e7eb;"}font-size:13px;color:#6b7280;font-family:${FONT_STACK};">${escapeHtml(label)}</td>
      <td style="padding:14px 20px;${isLast ? "" : "border-bottom:1px solid #e5e7eb;"}font-size:14px;color:#111827;font-weight:700;text-align:right;font-family:${FONT_STACK};">${escapeHtml(value)}</td>
    </tr>
  `;
  const bodyHtml = `
    ${paragraph(`Hi ${escapeHtml(input.recipientName)}, your account on <strong>${escapeHtml(input.companyName)}</strong>'s HR Platform workspace is ready to go.`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background-color:#f9fafb;border-radius:12px;overflow:hidden;">
      ${row("🏢 Company ID", input.companySlug)}
      ${row("✉️ Email", input.email)}
      ${row("🔑 Temporary password", input.tempPassword, true)}
    </table>
    <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;font-family:${FONT_STACK};">👋 Sign in with the details above — you'll be asked to set your own password the first time you log in.</p>
  `;
  return emailLayout({
    preheader: `Your HR Platform account for ${input.companyName} is ready`,
    icon: "🎉",
    heading: "Welcome to HR Platform",
    bodyHtml,
  });
}
