export type AssistantStatus =
  | "idle"
  | "listening"
  | "processing"
  | "thinking"
  | "speaking"
  | "error"
  | "offline";

export type Role = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: Role;
  message: string;
  created_at?: string;
}

export interface Memory {
  id: string;
  category: string;
  key: string;
  value: string;
  importance: number;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceStatus {
  ai: "online" | "offline";
  stt: "ready" | "offline";
  tts: "ready" | "offline";
  memory: "online" | "offline";
  search: "online" | "offline";
  network: "online" | "offline";
}
