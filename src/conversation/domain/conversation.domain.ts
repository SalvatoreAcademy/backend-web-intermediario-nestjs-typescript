export enum ConversationStatus {
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
}

export interface ConversationDomain {
  id: string;
  input: string;
  response: string | null;
  respondedAt: Date | null;
  status: ConversationStatus;
  conversationId: string;
}
