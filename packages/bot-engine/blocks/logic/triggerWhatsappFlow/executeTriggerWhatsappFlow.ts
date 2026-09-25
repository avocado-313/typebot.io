import { SessionState, TriggerWhatsappFlowBlock } from '@typebot.io/schemas'
import { ExecuteLogicResponse } from '../../../types'
import { parseVariables } from '@typebot.io/variables/parseVariables'
import { byId } from '@typebot.io/lib'

/**
 * Fires a WhatsApp Flow at the current contact and lets the conversation
 * continue normally — the Flow is filled out asynchronously in WhatsApp's own
 * native UI. Unlike Assign Chat, this is not a handoff: without response
 * mappings the bot keeps talking and the completion only lands in the
 * platform's own flow-response ledger. With mappings, the session parks on
 * this block until the Hub forwards the `nfm_reply` (or any other message —
 * see `resumeTriggerWhatsappFlow`).
 *
 * Every mapped variable is resolved to its CURRENT literal value here, before
 * the action ever leaves the engine — the receiving side (the Hub) is handed
 * plain data, never a `{{Variable}}` placeholder to interpret itself.
 */
export const executeTriggerWhatsappFlow = (
  state: SessionState,
  block: TriggerWhatsappFlowBlock
): ExecuteLogicResponse => {
  const { variables } = state.typebotsQueue[0].typebot

  if (!block.options?.flowId) return { outgoingEdgeId: block.outgoingEdgeId }

  const data = (block.options.variableMapping ?? []).reduce<
    Record<string, unknown>
  >((acc, mapping) => {
    if (!mapping.fieldName || !mapping.variableId) return acc
    const variable = variables.find(byId(mapping.variableId))
    if (!variable) return acc
    acc[mapping.fieldName] = variable.value
    return acc
  }, {})

  const expectsDedicatedReply = (
    block.options.responseVariableMapping ?? []
  ).some((mapping) => mapping.fieldName && mapping.variableId)

  return {
    outgoingEdgeId: block.outgoingEdgeId,
    clientSideActions: [
      {
        type: 'triggerWhatsappFlow',
        expectsDedicatedReply,
        triggerWhatsappFlow: {
          flowId: block.options.flowId,
          body: block.options.body
            ? parseVariables(variables)(block.options.body)
            : undefined,
          cta: block.options.cta
            ? parseVariables(variables)(block.options.cta)
            : undefined,
          data,
        },
      },
    ],
  }
}
