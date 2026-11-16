import { safeStringify } from '@typebot.io/lib/safeStringify'
import { Variable } from './types'
import { getVariableValueAtPath } from './parseVariables'

export const findUniqueVariableValue =
  (variables: Variable[]) =>
  (value: string | undefined): Variable['value'] => {
    if (!value || !value.startsWith('{{') || !value.endsWith('}}')) return null
    const variableName = value.slice(2, -2)
    const variable = variables.find(
      (variable) => variable.name === variableName
    )
    if (variable) return variable.value ?? null
    const pathValue = getVariableValueAtPath(variables, variableName)?.value
    return Array.isArray(pathValue)
      ? pathValue.map(safeStringify)
      : safeStringify(pathValue)
  }
