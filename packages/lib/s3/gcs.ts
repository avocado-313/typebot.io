import { env } from '@typebot.io/env'
import { Storage } from '@google-cloud/storage'

// Object keys are byte-for-byte the S3 ones (public/..., private/...): the
// media was copied from S3 with its layout intact, so a key computed from an
// old DB row resolves in GCS exactly as it did in S3.

let storage: Storage | undefined

const getStorage = () => {
  if (storage) return storage
  storage = new Storage(
    env.GCP_MEDIA_SA_KEY
      ? { credentials: JSON.parse(env.GCP_MEDIA_SA_KEY) }
      : // No key => Application Default Credentials (developer machines).
        undefined
  )
  return storage
}

export const isGcsEnabled = () => Boolean(env.GCS_BUCKET)

const getPublicBucketName = () =>
  env.GCS_PUBLIC_BUCKET ?? (env.GCS_BUCKET as string)

export const getGcsBucketName = (key: string) =>
  key.startsWith('public/') ? getPublicBucketName() : (env.GCS_BUCKET as string)

export const getGcsFile = (key: string) =>
  getStorage().bucket(getGcsBucketName(key)).file(key)

export const getGcsBucket = (key: string) =>
  getStorage().bucket(getGcsBucketName(key))

export const getGcsPublicBaseUrl = () =>
  env.GCS_PUBLIC_URL?.replace(/\/+$/, '') ??
  `https://storage.googleapis.com/${getPublicBucketName()}`
