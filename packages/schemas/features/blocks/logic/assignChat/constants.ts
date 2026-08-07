export enum assignChatType {
  AGENT = 'agent',
  TEAM = 'team',
  HANDOVER = 'handover',
  SMART_ASSIGNMENT = 'smart_assignment',
}

export const assignChatTypeOptions = [
  assignChatType.AGENT,
  assignChatType.TEAM,
  assignChatType.HANDOVER,
  assignChatType.SMART_ASSIGNMENT,
] as const satisfies assignChatType[]
