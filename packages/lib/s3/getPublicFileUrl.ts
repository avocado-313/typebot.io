import { env } from '@typebot.io/env'

// Always resolve against S3_BUCKET so file links point at the bucket files were uploaded to
export const getPublicFileUrl = (key: string) =>
  `http${env.S3_SSL ? 's' : ''}://${env.S3_ENDPOINT}${
    env.S3_PORT ? `:${env.S3_PORT}` : ''
  }/${env.S3_BUCKET}/${key}`
