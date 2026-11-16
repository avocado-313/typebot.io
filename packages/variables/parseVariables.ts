import { safeStringify } from '@typebot.io/lib/safeStringify'
import { getAtPath, isDefined, isNotDefined } from '@typebot.io/lib/utils'
import { Variable, VariableWithValue } from './types'
import { createCodeRunner } from './codeRunners'

export type ParseVariablesOptions = {
  fieldToParse?: 'value' | 'id'
  isInsideJson?: boolean
  takeLatestIfList?: boolean
  isInsideHtml?: boolean
}

export const defaultParseVariablesOptions: ParseVariablesOptions = {
  fieldToParse: 'value',
  isInsideJson: false,
  takeLatestIfList: false,
  isInsideHtml: false,
}

// {{= inline code =}}
const inlineCodeRegex = /\{\{=(.+?)=\}\}/g

// {{variable}} and ${{{variable}}}
const variableRegex = /\{\{([^{}]+)\}\}|(\$)\{\{([^{}]+)\}\}/g

export const parseVariables =
  (
    variables: Variable[],
    options: ParseVariablesOptions = defaultParseVariablesOptions
  ) =>
  (text: string | undefined): string => {
    if (!text || text === '') return ''
    const textWithInlineCodeParsed = text.replace(
      inlineCodeRegex,
      (_full, inlineCodeToEvaluate) => {
        const value = evaluateInlineCode(inlineCodeToEvaluate, { variables })
        return safeStringify(value) ?? value
      }
    )

    return textWithInlineCodeParsed.replace(
      variableRegex,
      (_full, nameInCurlyBraces, _dollarSign, nameInTemplateLitteral) => {
        const dollarSign = (_dollarSign ?? '') as string
        const matchedVarName = nameInCurlyBraces ?? nameInTemplateLitteral
        const variable = variables.find((variable) => {
          return (
            matchedVarName === variable.name &&
            (options.fieldToParse === 'id' || isDefined(variable.value))
          )
        }) as VariableWithValue | undefined
        if (variable && options.fieldToParse === 'id')
          return dollarSign + variable.id
        const pathValue = variable
          ? undefined
          : getVariableValueAtPath(variables, matchedVarName)
        if (!variable && !pathValue) return dollarSign + ''
        // Code is evaluated with variables passed by id, which can't carry a
        // path, so the resolved value is inlined as a JS literal instead.
        if (options.fieldToParse === 'id')
          return dollarSign + (JSON.stringify(pathValue?.value) ?? 'undefined')
        const value = variable ? variable.value : pathValue?.value
        if (isNotDefined(value)) return dollarSign + ''
        if (options.isInsideJson)
          return dollarSign + parseVariableValueInJson(value)
        const parsedValue =
          dollarSign +
          safeStringify(
            options.takeLatestIfList && Array.isArray(value)
              ? value[value.length - 1]
              : value
          )
        if (!parsedValue) return dollarSign + ''
        if (options.isInsideHtml) return parseVariableValueInHtml(parsedValue)
        return parsedValue
      }
    )
  }

const evaluateInlineCode = (
  code: string,
  { variables }: { variables: Variable[] }
) => {
  try {
    const body = parseVariables(variables, { fieldToParse: 'id' })(code)
    return createCodeRunner({ variables })(
      body.includes('return ') ? body : `return ${body}`
    )
  } catch (err) {
    return parseVariables(variables)(code)
  }
}

type VariableToParseInformation = {
  startIndex: number
  endIndex: number
  textToReplace: string
  value: string
  variableId?: string
}

export const getVariablesToParseInfoInText = (
  text: string,
  {
    variables,
    takeLatestIfList,
  }: { variables: Variable[]; takeLatestIfList?: boolean }
): VariableToParseInformation[] => {
  const variablesToParseInfo: VariableToParseInformation[] = []
  const inlineCodeMatches = [...text.matchAll(inlineCodeRegex)]
  inlineCodeMatches.forEach((match) => {
    if (isNotDefined(match.index) || !match[0].length) return
    const inlineCodeToEvaluate = match[1]
    const evaluatedValue = evaluateInlineCode(inlineCodeToEvaluate, {
      variables,
    })
    variablesToParseInfo.push({
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      textToReplace: match[0],
      value:
        safeStringify(
          takeLatestIfList && Array.isArray(evaluatedValue)
            ? evaluatedValue[evaluatedValue.length - 1]
            : evaluatedValue
        ) ?? '',
    })
  })
  const textWithInlineCodeParsed = text.replace(
    inlineCodeRegex,
    (_full, inlineCodeToEvaluate) =>
      evaluateInlineCode(inlineCodeToEvaluate, { variables })
  )
  const variableMatches = [...textWithInlineCodeParsed.matchAll(variableRegex)]
  variableMatches.forEach((match) => {
    if (isNotDefined(match.index) || !match[0].length) return
    const matchedVarName = match[1] ?? match[3]
    const variable = variables.find((variable) => {
      return matchedVarName === variable.name
    }) as VariableWithValue | undefined
    const value = variable
      ? variable.value
      : getVariableValueAtPath(variables, matchedVarName)?.value
    variablesToParseInfo.push({
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      textToReplace: match[0],
      value:
        safeStringify(
          takeLatestIfList && Array.isArray(value)
            ? value[value.length - 1]
            : value
        ) ?? '',
      variableId: variable?.id,
    })
  })
  return variablesToParseInfo.sort((a, b) => a.startIndex - b.startIndex)
}

// Resolves `{{name.path.to.field}}` when `name` holds a JSON value, e.g.
// `{{message_body.text.body}}`. Returns undefined if there is no `name` variable.
export const getVariableValueAtPath = (
  variables: Variable[],
  fullName: string
): { value: unknown } | undefined => {
  const dotIndex = fullName.indexOf('.')
  if (dotIndex === -1) return
  const variable = variables.find(
    (variable) => variable.name === fullName.slice(0, dotIndex)
  )
  if (!variable) return
  if (typeof variable.value !== 'string') return { value: undefined }
  try {
    return {
      value: getAtPath(
        JSON.parse(variable.value),
        fullName.slice(dotIndex + 1)
      ),
    }
  } catch {
    return { value: undefined }
  }
}

const parseVariableValueInJson = (value: unknown) => {
  const stringifiedValue = JSON.stringify(value)
  if (typeof value === 'string') return stringifiedValue.slice(1, -1)
  return stringifiedValue
}

const parseVariableValueInHtml = (
  value: VariableWithValue['value']
): string => {
  if (typeof value === 'string')
    return value.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return JSON.stringify(value).replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
