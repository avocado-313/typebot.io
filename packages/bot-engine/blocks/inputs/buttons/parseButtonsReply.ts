import { ChoiceInputBlock, SessionState } from '@typebot.io/schemas'
import { injectVariableValuesInButtonsInputBlock } from './injectVariableValuesInButtonsInputBlock'
import { ParsedReply } from '../../../types'
import {
  interactiveButtonType,
  interactiveLimits,
} from '@typebot.io/schemas/features/blocks/inputs/choice/constants'

export const parseButtonsReply =
  (state: SessionState) =>
  (inputValue: string, block: ChoiceInputBlock): ParsedReply => {
    const displayedItems =
      injectVariableValuesInButtonsInputBlock(state)(block).items
    if (block.options?.isMultipleChoice) {
      const longestItemsFirst = [...displayedItems].sort(
        (a, b) => (b.content?.length ?? 0) - (a.content?.length ?? 0)
      )
      const matchedItemsByContent = longestItemsFirst.reduce<{
        strippedInput: string
        matchedItemIds: string[]
      }>(
        (acc, item) => {
          if (
            item.content &&
            acc.strippedInput
              .toLowerCase()
              .includes(item.content.trim().toLowerCase())
          )
            return {
              strippedInput: acc.strippedInput.replace(item.content ?? '', ''),
              matchedItemIds: [...acc.matchedItemIds, item.id],
            }
          return acc
        },
        {
          strippedInput: inputValue.trim(),
          matchedItemIds: [],
        }
      )
      const remainingItems = displayedItems.filter(
        (item) => !matchedItemsByContent.matchedItemIds.includes(item.id)
      )
      const matchedItemsByIndex = remainingItems.reduce<{
        strippedInput: string
        matchedItemIds: string[]
      }>(
        (acc, item, idx) => {
          if (acc.strippedInput.includes(`${idx + 1}`))
            return {
              strippedInput: acc.strippedInput.replace(`${idx + 1}`, ''),
              matchedItemIds: [...acc.matchedItemIds, item.id],
            }
          return acc
        },
        {
          strippedInput: matchedItemsByContent.strippedInput,
          matchedItemIds: [],
        }
      )
      const matchedItems = displayedItems.filter((item) =>
        [
          ...matchedItemsByContent.matchedItemIds,
          ...matchedItemsByIndex.matchedItemIds,
        ].includes(item.id)
      )
      if (matchedItems.length === 0) return { status: 'fail' }
      return {
        status: 'success',
        reply: matchedItems.map((item) => item.content).join(', '),
      }
    }
    const longestItemsFirst = [...displayedItems].sort(
      (a, b) => (b.content?.length ?? 0) - (a.content?.length ?? 0)
    )
    const matchedItem =
      longestItemsFirst.find(
        (item) =>
          item.id === inputValue ||
          (item.content && inputValue.trim() === item.content.trim())
      ) ?? findItemByTruncatedTitle(displayedItems, inputValue, block)
    if (!matchedItem) return { status: 'fail' }
    return {
      status: 'success',
      reply: matchedItem.content ?? '',
    }
  }

// WhatsApp cuts long button and row titles, and the tapped title is what comes
// back as the reply. Match it against the start of the full item label.
const findItemByTruncatedTitle = (
  items: ChoiceInputBlock['items'],
  inputValue: string,
  block: ChoiceInputBlock
) => {
  if (!block.options?.isInteractive) return
  const { itemLabelMaxLength } =
    interactiveLimits[
      block.options.interactiveButtonType ?? interactiveButtonType.REPLY
    ]
  // Cut the raw label like the hub does, then compare trimmed values.
  const trimmedInput = inputValue.trim()
  if (!trimmedInput) return
  return items.find((item) => {
    const contentChars = Array.from(item.content ?? '')
    return (
      contentChars.length > itemLabelMaxLength &&
      contentChars.slice(0, itemLabelMaxLength).join('').trim() === trimmedInput
    )
  })
}
