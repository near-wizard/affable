import { Resend } from 'resend'

console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY)
console.log('Posthog_API_KEY:', process.env.NEXT_PUBLIC_POSTHOG_KEY)

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function sendConfirmationEmail(toEmail: string, name: string) {
  const message = {
    from: 'no-reply@affable.com',
    to: toEmail,
    subject: 'Thanks for your interest in AffableLink!',
    text: `Hi ${name},\n\nThanks for your interest in Affable Link! We'll be in touch shortly to set up a conversation.`,
    html: `<p>Hi ${name},</p><p>Thanks for your interest in Affable Link! We'll be in touch shortly to set up a conversation.</p>`,
  }

  const info = await resend.emails.send(message)

  // info.id exists if send is successful
  console.log('Email sent, id:', info.id ?? 'no id returned')
  return info
}