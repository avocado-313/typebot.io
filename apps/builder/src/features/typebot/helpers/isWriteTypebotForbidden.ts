import { env } from '@typebot.io/env'
import {
  CollaborationType,
  CollaboratorsOnTypebots,
  MemberInWorkspace,
  User,
  Workspace,
} from '@typebot.io/prisma'

export const isWriteTypebotForbidden = async (
  typebot: {
    collaborators: Pick<CollaboratorsOnTypebots, 'userId' | 'type'>[]
  } & {
    workspace: Pick<Workspace, 'isSuspended' | 'isPastDue'> & {
      members: Pick<MemberInWorkspace, 'userId' | 'role'>[]
    }
  },
  user: Pick<User, 'id'> & { email?: string | null },
  { allowSuperAdmin = false }: { allowSuperAdmin?: boolean } = {}
) => {
  if (typebot.workspace.isSuspended || typebot.workspace.isPastDue) return true

  // Super-admin recovery flows (e.g. restoreTypebot) opt in to bypass the
  // collaborator/membership check, mirroring isReadTypebotForbidden.
  if (allowSuperAdmin && user.email && env.ADMIN_EMAIL?.includes(user.email))
    return false

  return (
    !typebot.collaborators.some(
      (collaborator) =>
        collaborator.userId === user.id &&
        collaborator.type === CollaborationType.WRITE
    ) &&
    !typebot.workspace.members.some(
      (m) => m.userId === user.id && m.role !== 'GUEST'
    )
  )
}
