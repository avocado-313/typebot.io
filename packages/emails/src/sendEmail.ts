import { createTransport, SendMailOptions } from 'nodemailer'
import { env } from '@typebot.io/env'
import sgMail from '@sendgrid/mail'

export const sendEmail = (
  props: Pick<SendMailOptions, 'to' | 'html' | 'subject'>
) => {
  // SendGrid's SMTP relay (port 587) gets its connections dropped mid-handshake
  // on some hosts. Their HTTPS API uses the same API key and isn't affected.
  if (env.SMTP_HOST === 'smtp.sendgrid.net' && env.SMTP_PASSWORD) {
    sgMail.setApiKey(env.SMTP_PASSWORD)
    return sgMail.send({
      to: props.to as string,
      from: env.NEXT_PUBLIC_SMTP_FROM as string,
      subject: props.subject as string,
      html: props.html as string,
    })
  }

  const transporter = createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    auth: {
      user: env.SMTP_USERNAME,
      pass: env.SMTP_PASSWORD,
    },
  })

  return transporter.sendMail({
    from: env.NEXT_PUBLIC_SMTP_FROM,
    ...props,
  })
}
