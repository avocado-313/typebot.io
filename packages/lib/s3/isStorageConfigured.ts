import { env } from '@typebot.io/env'
import { isGcsEnabled } from './gcs'

export const isStorageConfigured = () =>
  isGcsEnabled() ||
  Boolean(env.S3_ENDPOINT && env.S3_ACCESS_KEY && env.S3_SECRET_KEY)

export const storageNotConfiguredMessage =
  'Storage not properly configured. Set GCS_BUCKET, or all of S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY'
