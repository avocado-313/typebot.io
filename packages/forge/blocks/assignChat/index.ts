import { createBlock } from '@typebot.io/forge'
import { AssignChatLogo } from './logo'
import { auth } from './auth'

export const assignChatBlock = createBlock({
  id: 'assign-chat',
  name: 'AssignChat',
  tags: [],
  LightLogo: AssignChatLogo,
  auth,
  actions: [],
})
