import { ChoiceInputBlock } from '@typebot.io/schemas'
import React from 'react'
import { interactiveButtonType } from '@typebot.io/schemas/features/blocks/inputs/choice/constants'
import { ButtonsBlockInteractiveSettings } from './ButtonsBlockInteractiveSettings'

type Props = {
  options?: ChoiceInputBlock['options']
  onOptionsChange: (options: ChoiceInputBlock['options']) => void
}

export const ButtonsBlockSettings = ({ options, onOptionsChange }: Props) => (
  <ButtonsBlockInteractiveSettings
    type={interactiveButtonType.REPLY}
    options={options}
    onOptionsChange={(newOptions) =>
      onOptionsChange({
        ...newOptions,
        isInteractive: true,
        interactiveButtonType: interactiveButtonType.REPLY,
      })
    }
  />
)
