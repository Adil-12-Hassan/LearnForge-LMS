import { transporter } from '../config/mail.js';

const FROM = `"LearnForge" <${process.env.SMTP_USER}>`;
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]!);

export const emailService = {
  async sendVerification(to: string, firstName: string, token: string) {
    const safeFirstName = escapeHtml(firstName);
    const link = `${process.env.CLIENT_URL}/verify-email/${token}`;
    await transporter.sendMail({
      from: FROM,
      to,
      subject: 'Verify your LearnForge account',
      html: `
        <h2>Welcome to LearnForge, ${safeFirstName}!</h2>
        <p>Click the link below to verify your email address:</p>
        <a href="${link}" style="background:#0ea5e9;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">
          Verify Email
        </a>
        <p>This link expires in 24 hours.</p>
      `,
    });
  },

  async sendPasswordReset(to: string, firstName: string, token: string) {
    const safeFirstName = escapeHtml(firstName);
    const link = `${process.env.CLIENT_URL}/reset-password/${token}`;
    await transporter.sendMail({
      from: FROM,
      to,
      subject: 'Reset your LearnForge password',
      html: `
        <h2>Password Reset Request</h2>
        <p>Hi ${safeFirstName}, click below to reset your password:</p>
        <a href="${link}" style="background:#0ea5e9;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">
          Reset Password
        </a>
        <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      `,
    });
  },
};
