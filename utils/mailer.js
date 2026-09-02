import { Resend } from 'resend'
import AdminConfig from '../models/adminConfig.model.js'

const resend = new Resend(process.env.RESEND_API_KEY)

/* ── Where "new submission" notifications go ──
   Admin-configurable via the notification-bell settings page.
   Falls back to MAIL_USER if nothing has been set. */
async function getNotificationInbox() {
  try {
    const config = await AdminConfig.findOne({ key: 'main' })
    return (config?.notificationEmail && config.notificationEmail.trim()) || process.env.MAIL_USER
  } catch (err) {
    console.error('getNotificationInbox error, falling back to MAIL_USER:', err)
    return process.env.MAIL_USER
  }
}

/* ── Shared "go check the panel" notification template ──
   Deliberately carries ZERO submitted content — no names, no message
   bodies, no contact details. Just what came in and a link to it.
   This is separate from the manual "Send to Email" action below,
   which an admin triggers on purpose and does carry full content. */
function notificationHtml({ heading, bodyLine, panelLink }) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#0f172a;border-bottom:2px solid #0d9488;padding-bottom:0.5rem">
        ${heading}
      </h2>
      <p style="color:#374151;line-height:1.6">${bodyLine}</p>
      ${panelLink ? `
        <a href="${panelLink}" style="display:inline-block;background:#0d9488;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:700;margin:14px 0">
          Open in Admin Panel
        </a>` : ''}
      <p style="color:#9ca3af;font-size:0.78rem;margin-top:1.5rem">
        This is an automatic notification. No submitted details are included here — sign in to the panel to view them.
      </p>
    </div>
  `
}

/* ── Shared sender ── */
async function send({ to, subject, html, text, replyTo, attachments }) {
  const payload = {
    from:    process.env.MAIL_FROM,
    to,
    subject,
    ...(html ? { html } : {}),
    ...(text ? { text } : {}),
    ...(replyTo ? { replyTo } : {}),
    ...(attachments ? { attachments } : {}),
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

export async function sendContactNotification({ name, email, subject, message, panelLink }) {
  const inbox = await getNotificationInbox()

  // Internal notification — zero submitted content, just a heads-up + link.
  await send({
    to: inbox,
    subject: `[WHTS Contact] A new contact message came in`,
    html: notificationHtml({
      heading: 'New Contact Message',
      bodyLine: 'A new contact message came in. Go check the panel for the details.',
      panelLink,
    }),
  })

  // Plain text confirmation receipt to the client (unrelated to the admin notification)
  await sendSubmissionReceiptEmail(email, name, 'contact message')
}

export async function sendReportNotification({ fullName, email, reportType, incidentType, panelLink }) {
  const inbox = await getNotificationInbox()

  await send({
    to: inbox,
    subject: `[WHTSIPA Report] A new ${reportType} incident report came in`,
    html: notificationHtml({
      heading: '🚨 New Incident Report Submitted',
      bodyLine: `A new ${reportType} incident report came in. Go check the panel for the details.`,
      panelLink,
    }),
  })

  if (email) {
    await sendSubmissionReceiptEmail(email, fullName, 'incident report')
  }
}

export async function sendBookingNotification({ name, email, panelLink }) {
  const inbox = await getNotificationInbox()

  await send({
    to: inbox,
    subject: `📞 A new call session booking came in`,
    html: notificationHtml({
      heading: '📞 New Call Session Booking',
      bodyLine: 'A new call session booking came in. Go check the panel for the details.',
      panelLink,
    }),
  })

  if (email) {
    await sendSubmissionReceiptEmail(email, name, 'call session booking')
  }
}

/* ── Manual "Send to Email" action ──
   Deliberate admin choice, separate from the automatic notifications
   above. Carries the FULL record content, laid out in a boxed/grid
   HTML table — never as a PDF (PDF stays admin-panel-download only). */
export async function sendRecordEmail({ to, title, fields }) {
  const rows = fields
    .filter(f => f.value !== undefined && f.value !== null && f.value !== '')
    .map(f => `
      <tr>
        <td style="padding:10px 14px;color:#6b7280;font-size:0.82rem;width:180px;border-bottom:1px solid #e5e7eb;vertical-align:top">${f.label}</td>
        <td style="padding:10px 14px;color:#0f172a;font-size:0.92rem;border-bottom:1px solid #e5e7eb;white-space:pre-wrap">${f.value}</td>
      </tr>
    `).join('')

  await send({
    to,
    subject: `[WHTSIPA] ${title}`,
    html: `
      <div style="font-family:sans-serif;max-width:640px;margin:auto">
        <h2 style="color:#0f172a;border-bottom:2px solid #0d9488;padding-bottom:0.5rem">${title}</h2>
        <table style="width:100%;border-collapse:collapse;margin:1rem 0;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden">
          ${rows}
        </table>
        <p style="color:#9ca3af;font-size:0.78rem;margin-top:1.25rem">
          Sent manually from the WHTSIPA admin panel.
        </p>
      </div>
    `,
  })
}

/* ── Manual "Email as Attachment" action (Batch 5) ──
   Sends an evidence file as a REAL email attachment — never embedded in
   or converted to a PDF. Admin triggers this from inside the attachment
   preview modal, after having already viewed the file (see AttachmentViewer.jsx),
   so this is never reachable as a blind, unreviewed download/send. */
export async function sendAttachmentEmail({ to, fileUrl, fileName }) {
  const fileRes = await fetch(fileUrl)
  if (!fileRes.ok) {
    throw new Error(`Could not retrieve the file from storage (status ${fileRes.status}).`)
  }
  const buffer = Buffer.from(await fileRes.arrayBuffer())

  await send({
    to,
    subject: `[WHTSIPA] Attachment: ${fileName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#0f172a;border-bottom:2px solid #0d9488;padding-bottom:0.5rem">Attachment Shared</h2>
        <p style="color:#374151;line-height:1.6">
          An evidence file has been shared with you from the WHTSIPA admin panel: <strong>${fileName}</strong>.
          It's attached to this email as the original file — not a PDF conversion.
        </p>
        <p style="color:#9ca3af;font-size:0.78rem;margin-top:1.5rem">
          Sent manually from the WHTSIPA admin panel.
        </p>
      </div>
    `,
    attachments: [{ filename: fileName, content: buffer.toString('base64') }],
  })
}
