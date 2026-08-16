import { create } from "zustand";
import type { AssistantStatus, ChatMessage, Memory, ServiceStatus } from "../types";

function uid(): string {
  return crypto.randomUUID();
}

function getSessionId(): string {
  const key = "jarvis_session_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = uid();
    localStorage.setItem(key, id);
  }
  return id;
}

interface JarvisState {
  sessionId: string;
  status: AssistantStatus;
  statusMessage: string | null;
  messages: ChatMessage[];
  memories: Memory[];
  serviceStatus: ServiceStatus | null;
  memoryPanelOpen: boolean;
  micError: string | null;

  setStatus: (status: AssistantStatus, message?: string | null) => void;
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  clearMessages: () => void;
  setMemories: (memories: Memory[]) => void;
  setServiceStatus: (status: ServiceStatus) => void;
  toggleMemoryPanel: () => void;
  setMicError: (error: string | null) => void;
}

export const useJarvisStore = create<JarvisState>((set) => ({
  sessionId: getSessionId(),
  status: "idle",
  statusMessage: null,
  messages: [],
  memories: [],
  serviceStatus: null,
  memoryPanelOpen: false,
  micError: null,

  setStatus: (status, message = null) => set({ status, statusMessage: message }),
  addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  setMessages: (messages) => set({ messages }),
  clearMessages: () => set({ messages: [] }),
  setMemories: (memories) => set({ memories }),
  setServiceStatus: (serviceStatus) => set({ serviceStatus }),
  toggleMemoryPanel: () => set((s) => ({ memoryPanelOpen: !s.memoryPanelOpen })),
  setMicError: (micError) => set({ micError }),
}));

export function makeMessage(role: ChatMessage["role"], message: string): ChatMessage {
  return { id: uid(), role, message, created_at: new Date().toISOString() };
}
