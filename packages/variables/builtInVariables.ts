import { Variable } from './types'

// Built-in variables exist in every typebot without manual setup and can't be
// renamed or deleted in the builder. The platform hub fills them:
// - message_body: raw payload of the latest incoming message (e.g. the
//   WhatsApp message object), refreshed on every reply.
// - contact_id: platform contact ID of the conversation, prefilled at start.
export const MESSAGE_BODY_VARIABLE_NAME = 'message_body'
export const CONTACT_ID_VARIABLE_NAME = 'contact_id'

const builtInVariables: Variable[] = [
  {
    id: 'vmessage_body',
    name: MESSAGE_BODY_VARIABLE_NAME,
    isSessionVariable: true,
  },
  {
    id: 'vcontact_id',
    name: CONTACT_ID_VARIABLE_NAME,
    isSessionVariable: true,
  },
]

export const isBuiltInVariable = (variable: Pick<Variable, 'name'>) =>
  builtInVariables.some((builtIn) => builtIn.name === variable.name)

// Adds the built-in variables a typebot doesn't define yet, so they exist even
// in bots created or published before they were introduced.
export const ensureBuiltInVariables = (variables: Variable[]): Variable[] => {
  const missing = builtInVariables.filter((builtIn) =>
    variables.every((variable) => variable.name !== builtIn.name)
  )
  return missing.length === 0 ? variables : [...variables, ...missing]
}

export const setMessageBodyVariable = (
  variables: Variable[],
  messageBody: Record<string, unknown> | undefined
): Variable[] => {
  if (!messageBody) return variables
  const value = JSON.stringify(messageBody)
  return ensureBuiltInVariables(variables).map((variable) =>
    variable.name === MESSAGE_BODY_VARIABLE_NAME
      ? { ...variable, value }
      : variable
  )
}
