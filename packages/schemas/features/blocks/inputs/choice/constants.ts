import { defaultButtonLabel } from '../constants'
import { ChoiceInputBlock } from './schema'

export enum interactiveButtonType {
  REPLY = 'reply',
  LIST = 'list',
}

export enum headerType {
  NONE = 'none',
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
}

export const interactiveButtonTypes = [
  interactiveButtonType.REPLY,
  interactiveButtonType.LIST,
] as const satisfies interactiveButtonType[]

export const interactiveReplyHeaderTypes = [
  headerType.NONE,
  headerType.TEXT,
  headerType.IMAGE,
  headerType.VIDEO,
  headerType.DOCUMENT,
] as const satisfies headerType[]

export const interactiveListHeaderTypes = [
  headerType.NONE,
  headerType.TEXT,
] as const satisfies headerType[]

// Meta's limits for interactive reply-button and list messages.
export const interactiveLimits = {
  bodyMaxLength: 1024,
  footerMaxLength: 60,
  textHeaderMaxLength: 60,
  listButtonTextMaxLength: 20,
  [interactiveButtonType.REPLY]: { maxItems: 3, itemLabelMaxLength: 20 },
  [interactiveButtonType.LIST]: { maxItems: 10, itemLabelMaxLength: 24 },
} as const

export const defaultChoiceInputOptions = {
  buttonLabel: defaultButtonLabel,
  searchInputPlaceholder: 'Filter the options...',
  isMultipleChoice: false,
  isSearchable: false,
  isInteractive: false,
  interactiveButtonType: interactiveButtonType.REPLY,
} as const satisfies ChoiceInputBlock['options']
