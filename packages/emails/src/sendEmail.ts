import { createTransport, SendMailOptions } from 'nodemailer'
import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses'
import { env } from '@typebot.io/env'

const isSesFallbackEnabled = Boolean(
  env.SES_ACCESS_KEY_ID && env.SES_SECRET_ACCESS_KEY && env.SES_REGION
)

export const sendEmail = async (
  props: Pick<SendMailOptions, 'to' | 'html' | 'subject'>
) => {
  const smtpTransporter = createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    auth: {
      user: env.SMTP_USERNAME,
      pass: env.SMTP_PASSWORD,
    },
  })

  try {
    return await smtpTransporter.sendMail({
      from: env.NEXT_PUBLIC_SMTP_FROM,
      ...props,
    })
  } catch (smtpError) {
    if (!isSesFallbackEnabled) throw smtpError
    console.error('SMTP send failed, falling back to SES:', smtpError)
    const sesTransporter = createTransport({
      SES: {
        ses: new SESClient({
          region: env.SES_REGION,
          credentials: {
            accessKeyId: env.SES_ACCESS_KEY_ID as string,
            secretAccessKey: env.SES_SECRET_ACCESS_KEY as string,
          },
        }),
        aws: { SendRawEmailCommand },
      },
    })
    return sesTransporter.sendMail({
      from: env.SES_FROM_EMAIL ?? env.NEXT_PUBLIC_SMTP_FROM,
      ...props,
    })
  }
}
