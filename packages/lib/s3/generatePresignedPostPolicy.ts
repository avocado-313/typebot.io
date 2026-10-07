import { env } from '@typebot.io/env'
import { Client, PostPolicyResult } from 'minio'
import { getGcsFile, isGcsEnabled } from './gcs'

type Props = {
  filePath: string
  fileType?: string
  maxFileSize?: number
}

const tenMinutes = 10 * 60

export const generatePresignedPostPolicy = async ({
  filePath,
  fileType,
  maxFileSize,
}: Props): Promise<PostPolicyResult> => {
  if (isGcsEnabled()) {
    // Every entry in fields is also signed into the policy as an exact match.
    const [{ url, fields }] = await getGcsFile(
      filePath
    ).generateSignedPostPolicyV4({
      expires: Date.now() + tenMinutes * 1000,
      conditions: maxFileSize
        ? [['content-length-range', 0, maxFileSize * 1024 * 1024]]
        : [],
      fields: {
        'Cache-Control': 'public, max-age=86400',
        ...(fileType ? { 'Content-Type': fileType } : {}),
      },
    })
    return { postURL: url.replace(/\/+$/, ''), formData: fields }
  }

  if (!env.S3_ENDPOINT || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY)
    throw new Error(
      'S3 not properly configured. Missing one of those variables: S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY'
    )

  const minioClient = new Client({
    endPoint: env.S3_ENDPOINT,
    port: env.S3_PORT,
    useSSL: env.S3_SSL,
    accessKey: env.S3_ACCESS_KEY,
    secretKey: env.S3_SECRET_KEY,
    region: env.S3_REGION,
  })

  const postPolicy = minioClient.newPostPolicy()
  if (maxFileSize)
    postPolicy.setContentLengthRange(0, maxFileSize * 1024 * 1024)
  postPolicy.setKey(filePath)
  postPolicy.setBucket(env.S3_BUCKET)
  postPolicy.setExpires(new Date(Date.now() + tenMinutes * 1000))
  postPolicy.formData['Cache-Control'] = 'public, max-age=86400'
  postPolicy.policy.conditions.push([
    'eq',
    '$Cache-Control',
    'public, max-age=86400',
  ])
  if (fileType) postPolicy.setContentType(fileType)

  return minioClient.presignedPostPolicy(postPolicy)
}
