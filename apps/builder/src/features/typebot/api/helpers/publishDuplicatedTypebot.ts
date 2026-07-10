import prisma from '@typebot.io/lib/prisma'
import { createId } from '@paralleldrive/cuid2'
import { Prisma } from '@typebot.io/prisma'
import { TypebotV6 } from '@typebot.io/schemas'
import { isPublicIdNotAvailable } from '../../helpers/sanitizers'

/**
 * Publishes a freshly duplicated bot so the Hub can serve it: assigns a unique publicId and
 * creates the PublicTypebot snapshot from the (already sanitized) v6 typebot. Returns the
 * publicId. Radar/risk checks are intentionally skipped — this runs on an admin duplicate of
 * an existing bot, not on untrusted input.
 */
export const publishDuplicatedTypebot = async (
  typebot: TypebotV6
): Promise<string> => {
  let publicId = createId()
  // Fresh cuids don't collide in practice, but guard against the unique constraint anyway.
  while (await isPublicIdNotAvailable(publicId)) publicId = createId()

  await prisma.typebot.update({
    where: { id: typebot.id },
    data: { publicId },
  })

  await prisma.publicTypebot.create({
    data: {
      version: '6',
      typebotId: typebot.id,
      edges: typebot.edges as unknown as Prisma.InputJsonValue,
      groups: typebot.groups as unknown as Prisma.InputJsonValue,
      events: (typebot.events ?? undefined) as unknown as Prisma.InputJsonValue,
      settings: typebot.settings as unknown as Prisma.InputJsonValue,
      variables: typebot.variables as unknown as Prisma.InputJsonValue,
      theme: typebot.theme as unknown as Prisma.InputJsonValue,
    },
  })

  return publicId
}
