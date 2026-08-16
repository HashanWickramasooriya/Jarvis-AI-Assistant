export type Role = "user" | "assistant" | "system";

export interface ConversationMessage {
  id?: string;
  session_id: string;
  role: Role;
  message: string;
  created_at?: string;
}

export interface Memory {
  id?: string;
  category: string;
  key: string;
  value: string;
  importance: number;
  created_at?: string;
  updated_at?: string;
}
