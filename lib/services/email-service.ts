import { Resend } from 'resend'

const FROM = process.env.EMAIL_FROM ?? 'Applyo <notifications@Applyo.app>'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export async function sendMatchNotification(email: string, name: string, matchCount: number) {
  if (!process.env.RESEND_API_KEY) return

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `${matchCount} new job match${matchCount > 1 ? 'es' : ''} found!`,
    html: `
      <h2>Hi ${name || 'there'},</h2>
      <p>Applyo found <strong>${matchCount} new job${matchCount > 1 ? 's' : ''}</strong> that match your profile.</p>
      <p>Head to your <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://Applyo.app'}/dashboard/candidate">dashboard</a> to review and approve them.</p>
      <p>— Applyo</p>
    `,
  })
}

export async function sendApplicationStatusEmail(email: string, name: string, jobTitle: string, status: string) {
  if (!process.env.RESEND_API_KEY) return

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `Application update: ${jobTitle}`,
    html: `
      <h2>Hi ${name || 'there'},</h2>
      <p>Your application for <strong>${jobTitle}</strong> has been updated to: <strong>${status}</strong>.</p>
      <p>Check your <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://Applyo.app'}/dashboard/candidate">applications</a> for details.</p>
      <p>— Applyo</p>
    `,
  })
}
