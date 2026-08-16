import { create } from "zustand";
import type { AssistantStatus, ChatMessage, Memory, ServiceStatus } from "../types";

function uid(): string {
  return crypto.randomUUID();
}

// Persisted once per browser (localStorage survives restarts, unlike
// sessionStorage/in-memory state) and reused on every visit; a cleared
// localStorage yields a fresh id, which is treated as a new device. This
// same value doubles as the device identity sent with memory requests
// (see client/src/lib/api.ts) — conversations and memories are both scoped
// to "this browser", so one persisted id serves both without duplicating
// the generation/storage logic.
export function getSessionId(): string {
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
