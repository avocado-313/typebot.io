import {
  SessionState,
  TriggerWhatsappFlowBlock,
  VariableWithUnknowValue,
} from '@typebot.io/schemas'
import { byId } from '@typebot.io/lib'
import { updateVariablesInSession } from '@typebot.io/variables/updateVariablesInSession'
import { ExecuteLogicResponse } from '../../../types'

/**
 * A completed Flow reaches the session as a text reply whose body is the raw
 * `nfm_reply.response_json` — WhatsApp always includes `flow_token` in it,
 * which is what tells it apart from a message the customer typed instead.
 */
export const parseWhatsappFlowResponse = (
  text: string | undefined
): Record<string, unknown> | undefined => {
  if (!text) return
  try {
    const parsed: unknown = JSON.parse(text)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed) &&
      'flow_token' in parsed
    )
      return parsed as Record<string, unknown>
  } catch {
    return
  }
}

/**
 * Resumes a Trigger WhatsApp Flow block parked waiting for the Flow's answers.
 * Anything other than a Flow response means the customer moved on without
 * submitting it: the bot continues with the mapped variables left untouched.
 */
export const resumeTriggerWhatsappFlow = ({
  state,
  block,
  replyText,
}: {
  state: SessionState
  block: TriggerWhatsappFlowBlock
  replyText: string | undefined
}): ExecuteLogicResponse => {
  const response = parseWhatsappFlowResponse(replyText)

  if (!response) return { outgoingEdgeId: block.outgoingEdgeId }

  const { variables } = state.typebotsQueue[0].typebot
  const newVariables = (block.options?.responseVariableMapping ?? []).reduce<
    VariableWithUnknowValue[]
  >((acc, mapping) => {
    if (!mapping.fieldName || !mapping.variableId) return acc
    if (!(mapping.fieldName in response)) return acc
    const variable = variables.find(byId(mapping.variableId))
    if (!variable) return acc
    return [...acc, { ...variable, value: response[mapping.fieldName] }]
  }, [])

  if (newVariables.length === 0) return { outgoingEdgeId: block.outgoingEdgeId }

  const { updatedState, newSetVariableHistory } = updateVariablesInSession({
    state,
    newVariables,
    currentBlockId: block.id,
  })

  return {
    outgoingEdgeId: block.outgoingEdgeId,
    newSessionState: updatedState,
    newSetVariableHistory,
  }
}
