import prisma from '@typebot.io/lib/prisma'
import { TRPCError } from '@trpc/server'
import { User } from '@typebot.io/prisma'
import { isReadWorkspaceFobidden } from '@/features/workspace/helpers/isReadWorkspaceFobidden'

// Verify the caller is a member of the workspace before exposing data of the
// business it is linked to.
export const assertWorkspaceReadable = async (
  workspaceId: string,
  user: Pick<User, 'id' | 'email'>
) => {
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId },
    include: { members: true },
  })
  if (!workspace || isReadWorkspaceFobidden(workspace, user))
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace not found' })
}
