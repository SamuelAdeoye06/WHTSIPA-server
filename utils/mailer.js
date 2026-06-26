import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
})

export async function sendVerificationEmail(to, token) {
  const link = `${process.env.CLIENT_URL}/verify-email?token=${token}`
  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: 'Confirm your WHTS account',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto">
        <h2 style="color:#0f172a">Confirm your email</h2>
        <p>Thanks for joining WHTS. Click the button below to verify your email address.</p>
        <a href="${link}" style="display:inline-block;background:#0d9488;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin:16px 0">
          Confirm Email
        </a>
        <p style="color:#6b7280;font-size:0.85rem">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
        <p style="color:#6b7280;font-size:0.85rem">Or copy this link: ${link}</p>
      </div>
    `,
  })
}

export async function sendPasswordResetEmail(to, token) {
  const link = `${process.env.CLIENT_URL}/reset-password?token=${token}`
  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: 'Reset your WHTS password',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto">
        <h2 style="color:#0f172a">Reset your password</h2>
        <p>We received a request to reset your password. Click the button below.</p>
        <a href="${link}" style="display:inline-block;background:#dc2626;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin:16px 0">
          Reset Password
        </a>
        <p style="color:#6b7280;font-size:0.85rem">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>
    `,
  })
}
export async function sendContactNotification({ name, email, subject, message }) {
  // ── CHANGE THIS EMAIL BEFORE DEPLOYMENT ──
  const SUPPORT_INBOX = 'support@example.com'

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: SUPPORT_INBOX,
    replyTo: email,
    subject: `[WHTS Contact] ${subject}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#0f172a;border-bottom:2px solid #0d9488;padding-bottom:0.5rem">
          New Contact Message
        </h2>
        <table style="width:100%;border-collapse:collapse;margin:1rem 0">
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:0.85rem;width:90px">From</td>
            <td style="padding:8px 0;color:#0f172a;font-weight:600">${name}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:0.85rem">Email</td>
            <td style="padding:8px 0"><a href="mailto:${email}" style="color:#0d9488">${email}</a></td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:0.85rem">Subject</td>
            <td style="padding:8px 0;color:#0f172a">${subject}</td>
          </tr>
        </table>
        <div style="background:#f8fafc;border-left:4px solid #0d9488;padding:1rem 1.25rem;border-radius:4px;margin:1rem 0">
          <div style="color:#6b7280;font-size:0.8rem;margin-bottom:0.5rem;text-transform:uppercase;letter-spacing:0.05em">Message</div>
          <p style="color:#0f172a;line-height:1.7;margin:0;white-space:pre-wrap">${message}</p>
        </div>
        <p style="color:#9ca3af;font-size:0.8rem;margin-top:1.5rem">
          Reply directly to this email to respond to ${name}. This message was submitted via the WHTS contact form.
        </p>
      </div>
    `,
  })
}