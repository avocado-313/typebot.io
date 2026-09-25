import { featherIconsBaseProps } from '@/components/icons'
import { Icon, IconProps } from '@chakra-ui/react'
import React from 'react'

export const ButtonsInputIcon = (props: IconProps) => (
  <Icon viewBox="0 0 24 24" {...featherIconsBaseProps} {...props}>
    <rect x="3" y="4" width="18" height="7" rx="2" />
    <rect x="3" y="13" width="18" height="7" rx="2" />
  </Icon>
)
