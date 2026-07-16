// Shared HTML builders for account-creation emails — kept separate from
// lib/email.ts (a pure Resend transport wrapper) and from
// features/profile/services/profile.service.ts's OTP-code email (a
// different lifecycle: one-time codes vs. a one-time welcome notice).

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function welcomeEmailHtml(input: {
  recipientName: string;
  companyName: string;
  companySlug: string;
  email: string;
  tempPassword: string;
}): string {
  return `
    <p>Hi ${escapeHtml(input.recipientName)},</p>
    <p>Your account on <strong>${escapeHtml(input.companyName)}</strong>'s HR Platform workspace has been created.</p>
    <table style="margin: 16px 0; font-size: 14px;">
      <tr><td style="padding-right: 12px; color: #6b7280;">Company ID</td><td><strong>${escapeHtml(input.companySlug)}</strong></td></tr>
      <tr><td style="padding-right: 12px; color: #6b7280;">Email</td><td><strong>${escapeHtml(input.email)}</strong></td></tr>
      <tr><td style="padding-right: 12px; color: #6b7280;">Temporary password</td><td><strong>${escapeHtml(input.tempPassword)}</strong></td></tr>
    </table>
    <p>Sign in with the Company ID, email, and temporary password above — you'll be asked to set your own password the first time you log in.</p>
    <p>If you didn't expect this email, you can ignore it.</p>
  `;
}
