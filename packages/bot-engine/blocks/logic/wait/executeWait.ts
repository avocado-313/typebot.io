import { ExecuteLogicResponse } from '../../../types'
import { SessionState, WaitBlock } from '@typebot.io/schemas'
import { parseVariables } from '@typebot.io/variables/parseVariables'
import { isNotDefined } from '@typebot.io/lib'

export const executeWait = (
  state: SessionState,
  block: WaitBlock
): ExecuteLogicResponse => {
  const { variables } = state.typebotsQueue[0].typebot
  if (!block.options?.secondsToWaitFor)
    return { outgoingEdgeId: block.outgoingEdgeId }

  const parsedSecondsToWaitFor = safeParseFloat(
    parseVariables(variables)(block.options.secondsToWaitFor)
  )

  if (isNotDefined(parsedSecondsToWaitFor))
    return { outgoingEdgeId: block.outgoingEdgeId }

  return {
    outgoingEdgeId: block.outgoingEdgeId,
    clientSideActions: parsedSecondsToWaitFor
      ? [
          {
            type: 'wait',
            wait: { secondsToWaitFor: parsedSecondsToWaitFor },
          },
        ]
      : undefined,
  }
}

const safeParseFloat = (value: string) => {
  const parsedValue = parseFloat(value)
  return isNaN(parsedValue) ? undefined : parsedValue
}
