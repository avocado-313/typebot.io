import {
  ContinueChatResponse,
  ChatSession,
  SetVariableHistoryItem,
} from '@typebot.io/schemas'
import { upsertResult } from './queries/upsertResult'
import { updateSession } from './queries/updateSession'
import { createSession } from './queries/createSession'
import { deleteSession } from './queries/deleteSession'
import { Prisma, VisitedEdge } from '@typebot.io/prisma'
import prisma from '@typebot.io/lib/prisma'

type Props = {
  session: Pick<ChatSession, 'state'> & { id?: string }
  input: ContinueChatResponse['input']
  logs: ContinueChatResponse['logs']
  clientSideActions: ContinueChatResponse['clientSideActions']
  visitedEdges: VisitedEdge[]
  setVariableHistory: SetVariableHistoryItem[]
  hasEmbedBubbleWithWaitEvent?: boolean
  initialSessionId?: string
}

export const saveStateToDatabase = async ({
  session: { state, id },
  input,
  logs,
  clientSideActions,
  visitedEdges,
  setVariableHistory,
  hasEmbedBubbleWithWaitEvent,
  initialSessionId,
}: Props) => {
  const containsSetVariableClientSideAction = clientSideActions?.some(
    (action) => action.expectsDedicatedReply
  )

  const isCompleted = Boolean(
    !input &&
      !containsSetVariableClientSideAction &&
      !hasEmbedBubbleWithWaitEvent
  )

  const resultId = state.typebotsQueue[0].resultId

  // Built as a factory so the session writes can be safely re-issued in the FK fallback
  // below (a PrismaPromise can't be reused after its transaction fails).
  const buildSessionQueries = (): Prisma.PrismaPromise<any>[] => {
    if (!id) return []
    if (isCompleted && resultId) return [deleteSession(id)]
    return [updateSession({ id, state, isReplying: false })]
  }

  const session = id
    ? { state, id }
    : await createSession({ id: initialSessionId, state, isReplying: false })

  if (!resultId) {
    const sessionQueries = buildSessionQueries()
    if (sessionQueries.length > 0) await prisma.$transaction(sessionQueries)
    return session
  }

  const answers = state.typebotsQueue[0].answers

  const queries: Prisma.PrismaPromise<any>[] = [
    ...buildSessionQueries(),
    upsertResult({
      resultId,
      typebot: state.typebotsQueue[0].typebot,
      isCompleted: Boolean(
        !input && !containsSetVariableClientSideAction && answers.length > 0
      ),
      hasStarted: answers.length > 0,
      lastChatSessionId: session.id,
      logs,
      visitedEdges,
      setVariableHistory,
    }),
  ]

  try {
    await prisma.$transaction(queries)
  } catch (err) {
    // The typebot this session belongs to no longer exists — e.g. it was deleted after the
    // chat started (the linked-bot / backup case: a Hub message arrives for a bot whose row
    // has since been removed). The Result FK then fails. Rather than 500ing, persist just the
    // session so the in-memory flow keeps responding; the result simply isn't recorded since
    // there's no typebot to attach it to.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2003'
    ) {
      console.error(
        `saveStateToDatabase: typebot ${state.typebotsQueue[0].typebot.id} no longer exists; persisting session without result (${err.message})`
      )
      const sessionQueries = buildSessionQueries()
      if (sessionQueries.length > 0) await prisma.$transaction(sessionQueries)
    } else throw err
  }

  return session
}
