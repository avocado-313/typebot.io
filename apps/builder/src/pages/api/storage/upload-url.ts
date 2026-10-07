import { NextApiRequest, NextApiResponse } from 'next'
import { getAuthenticatedUser } from '@/features/auth/helpers/getAuthenticatedUser'
import {
  badRequest,
  methodNotAllowed,
  notAuthenticated,
} from '@typebot.io/lib/api'
import { generatePresignedPostPolicy } from '@typebot.io/lib/s3/generatePresignedPostPolicy'
import {
  isStorageConfigured,
  storageNotConfiguredMessage,
} from '@typebot.io/lib/s3/isStorageConfigured'

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'GET') {
    const user = await getAuthenticatedUser(req, res)
    if (!user) return notAuthenticated(res)

    if (!isStorageConfigured())
      return badRequest(res, storageNotConfiguredMessage)
    const filePath = req.query.filePath as string | undefined
    const fileType = req.query.fileType as string | undefined
    if (!filePath || !fileType) return badRequest(res)
    const presignedPostPolicy = await generatePresignedPostPolicy({
      fileType,
      filePath,
    })

    return res.status(200).send({
      presignedUrl: `${presignedPostPolicy.postURL}/${presignedPostPolicy.formData.key}`,
      formData: presignedPostPolicy.formData,
    })
  }
  return methodNotAllowed(res)
}

export default handler
