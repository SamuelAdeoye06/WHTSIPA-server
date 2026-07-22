import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

/* ── Shared sender ── */
async function send({ to, subject, html, text, replyTo }) {
  const payload = {
    from:    process.env.MAIL_FROM,
    to,
    subject,
    ...(html ? { html } : {}),
    ...(text ? { text } : {}),
    ...(replyTo ? { replyTo } : {}),
  }

  const { data, error } = await resend.emails.send(payload)

  if (error) {
    console.error('Resend send error:', error)
    throw new Error(error.message || 'Failed to send email.')
  }
  return data
}

/* ── Plain-Text Confirmation Email to User (No Links) ── */
export async function sendSubmissionReceiptEmail(to, name = 'Valued Client', submissionType = 'request') {
  const textContent = `Hello ${name},

Your ${submissionType} has been successfully received by WHTSIPA.

Your request is now in queue and awaiting review by an Active Representative. Our team will process your submission and reach out to you shortly.

Thank you for contacting WHTSIPA.

Best regards,
WHTSIPA Security & Support Team`

  await send({
    to,
    subject: `[WHTSIPA] Confirmation: Your ${submissionType} has been received`,
    text: textContent,
  })
}

/* ── OTP verification email ── */
export async function sendOtpEmail(to, otp, firstName = '') {
  await send({
    to,
    subject: `${otp} is your WHTS verification code`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto">
        <h2 style="color:#0f172a">Confirm your email</h2>
        <p>${firstName ? `Hi ${firstName}, thanks` : 'Thanks'} for joining WHTS. Enter the code below to verify your email address.</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;margin:20px 0;text-align:center">
          <span style="font-size:2rem;font-weight:800;letter-spacing:0.4em;color:#0d9488">${otp}</span>
        </div>
        <p style="color:#6b7280;font-size:0.85rem">This code expires in 10 minutes. If you didn't create an account, ignore this email.</p>
      </div>
    `,
  })
}

/* ── Password reset email ── */
export async function sendPasswordResetEmail(to, token) {
  const link = `${process.env.CLIENT_URL}/reset-password?token=${token}`
  await send({
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
  const SUPPORT_INBOX = process.env.MAIL_USER

  // Send admin notification
  await send({
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
      </div>
    `,
  })

  // Send plain text confirmation receipt to client
  await sendSubmissionReceiptEmail(email, name, 'contact message')
}

export async function sendReportNotification({ fullName, email, reportType, incidentType, phone, country }) {
  const SUPPORT_INBOX = process.env.MAIL_USER

  await send({
    to: SUPPORT_INBOX,
    subject: `[WHTSIPA Report] New ${reportType} incident — ${incidentType}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#0f172a;border-bottom:2px solid #dc2626;padding-bottom:0.5rem">
          🚨 New Incident Report Submitted
        </h2>
        <table style="width:100%;border-collapse:collapse;margin:1rem 0">
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:0.85rem;width:130px">Report Type</td>
            <td style="padding:8px 0;color:#0f172a;font-weight:600;text-transform:capitalize">${reportType}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:0.85rem">Incident Type</td>
            <td style="padding:8px 0;color:#dc2626;font-weight:600">${incidentType}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:0.85rem">Reporter Name</td>
            <td style="padding:8px 0;color:#0f172a">${fullName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:0.85rem">Email</td>
            <td style="padding:8px 0"><a href="mailto:${email}" style="color:#0d9488">${email}</a></td>
          </tr>
        </table>
      </div>
    `,
  })

  if (email) {
    await sendSubmissionReceiptEmail(email, fullName, 'incident report')
  }
}

export async function sendBookingNotification({ name, email, phone, preferredDate, preferredTime, notes }) {
  await send({
    to: process.env.MAIL_USER,
    subject: `📞 New Call Session Booked — ${name}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#0f172a;border-bottom:2px solid #1d4ed8;padding-bottom:0.75rem">
          📞 New Call Session Booking
        </h2>
        <table style="width:100%;border-collapse:collapse;margin:1rem 0">
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:0.85rem;width:130px">Name</td>
            <td style="padding:8px 0;color:#0f172a;font-weight:600">${name}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:0.85rem">Email</td>
            <td style="padding:8px 0">${email}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:0.85rem">Date / Time</td>
            <td style="padding:8px 0;color:#0f172a">${preferredDate} at ${preferredTime}</td>
          </tr>
        </table>
      </div>
    `,
  })

  if (email) {
    await sendSubmissionReceiptEmail(email, name, 'call session booking')
  }
}
