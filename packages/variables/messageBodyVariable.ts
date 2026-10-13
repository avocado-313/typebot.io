import { Variable } from './types'

// Built-in variable holding the raw platform payload of the latest incoming
// message (e.g. the WhatsApp `message_body`), refreshed on every reply.
export const MESSAGE_BODY_VARIABLE_NAME = 'message_body'
export const MESSAGE_BODY_VARIABLE_ID = 'vmessage_body'

export const isMessageBodyVariable = (variable: Pick<Variable, 'name'>) =>
  variable.name === MESSAGE_BODY_VARIABLE_NAME

// Adds the variable when the typebot doesn't define it yet, so it exists even
// in bots created or published before it was introduced.
export const ensureMessageBodyVariable = (variables: Variable[]): Variable[] =>
  variables.some(isMessageBodyVariable)
    ? variables
    : [
        ...variables,
        {
          id: MESSAGE_BODY_VARIABLE_ID,
          name: MESSAGE_BODY_VARIABLE_NAME,
          isSessionVariable: true,
        },
      ]

export const setMessageBodyVariable = (
  variables: Variable[],
  messageBody: Record<string, unknown> | undefined
): Variable[] => {
  if (!messageBody) return variables
  const value = JSON.stringify(messageBody)
  return ensureMessageBodyVariable(variables).map((variable) =>
    isMessageBodyVariable(variable) ? { ...variable, value } : variable
  )
}
