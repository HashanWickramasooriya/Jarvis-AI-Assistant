import {
  rememberFact,
  forgetFact,
  clearAllMemories,
  clearConversation,
  listMemories,
  isMemoryAvailable,
  memoryUnavailableMessage,
} from "./memoryService.js";
import { capabilities } from "../env.js";

export interface CommandResult {
  handled: boolean;
  reply?: string;
}

/**
 * Deterministic command routing. Only handles unambiguous, safe commands
 * (time/date, memory management). Anything else falls through to the AI
 * brain. Never executes shell commands or arbitrary system actions.
 */
export async function tryHandleCommand(
  text: string,
  sessionId: string
): Promise<CommandResult> {
  const t = text.trim().toLowerCase();

  if (/\b(what('s| is) the time|what time is it)\b/.test(t)) {
    const now = new Date();
    return {
      handled: true,
      reply: `It is currently ${now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })}.`,
    };
  }

  if (/\b(what('s| is) (today's|the) date|what day is it)\b/.test(t)) {
    const now = new Date();
    return {
      handled: true,
      reply: `Today is ${now.toLocaleDateString("en-GB", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })}.`,
    };
  }

  if (/^clear (my )?conversation\.?$/.test(t) || /^clear (the )?chat\.?$/.test(t)) {
    if (!isMemoryAvailable()) return { handled: true, reply: memoryUnavailableMessage };
    await clearConversation(sessionId);
    return { handled: true, reply: "Conversation history cleared." };
  }

  if (/^(system status|open diagnostics|run diagnostics)\.?$/.test(t)) {
    const line = (label: string, on: boolean, onWord: string, offWord: string) =>
      `- ${label}: ${on ? onWord : offWord}`;
    const lines = [
      line("Cognitive core", capabilities.ai, "active", "offline"),
      line("Memory core", capabilities.memory, "synchronized", "offline"),
      line("Voice input", capabilities.stt, "ready", "offline"),
      line("Voice output", capabilities.tts, "ready", "offline"),
      line("External data", capabilities.search, "online", "standby"),
    ].join("\n");
    return { handled: true, reply: `System diagnostics:\n${lines}` };
  }

  if (/^clear (all (my )?memor(y|ies)|memory)\.?$/.test(t)) {
    if (!isMemoryAvailable()) return { handled: true, reply: memoryUnavailableMessage };
    await clearAllMemories();
    return { handled: true, reply: "All stored memories have been cleared." };
  }

  if (/^(show|list) (my )?memor(y|ies)\.?$/.test(t)) {
    if (!isMemoryAvailable()) return { handled: true, reply: memoryUnavailableMessage };
    const memories = await listMemories();
    if (memories.length === 0) {
      return { handled: true, reply: "I don't have any stored memories yet." };
    }
    const lines = memories
      .map((m) => `- [${m.category}] ${m.key}: ${m.value}`)
      .join("\n");
    return { handled: true, reply: `Here is what I currently remember:\n${lines}` };
  }

  const forgetMatch = t.match(/^forget (my |about )?(.+?)\.?$/);
  if (forgetMatch) {
    if (!isMemoryAvailable()) return { handled: true, reply: memoryUnavailableMessage };
    const topic = forgetMatch[2].trim();
    const memories = await listMemories();
    const match = memories.find(
      (m) => m.key.toLowerCase().includes(topic) || topic.includes(m.key.toLowerCase())
    );
    if (match) {
      await forgetFact(match.category, match.key);
      return { handled: true, reply: `Understood. I've forgotten your ${match.key}.` };
    }
    return { handled: true, reply: `I don't have anything stored about "${topic}".` };
  }

  const rememberMatch = text.match(/^remember (that )?(.+)$/i);
  if (rememberMatch) {
    if (!isMemoryAvailable()) return { handled: true, reply: memoryUnavailableMessage };
    const fact = rememberMatch[2].trim();
    const parsed = parseFact(fact);
    await rememberFact(parsed.category, parsed.key, parsed.value, 4);
    return { handled: true, reply: "Understood. I'll remember that." };
  }

  return { handled: false };
}

/**
 * Very small heuristic extractor for common "my X is Y" / "I <verb> Y"
 * patterns so explicit "remember ..." commands land in a sensible
 * category/key rather than a single opaque blob.
 */
function parseFact(fact: string): { category: string; key: string; value: string } {
  const lower = fact.toLowerCase();

  let m = lower.match(/^my name is (.+)$/);
  if (m) return { category: "identity", key: "name", value: capitalize(m[1]) };

  m = lower.match(/^(?:my )?favou?rite (\w+) is (.+)$/);
  if (m) return { category: "preference", key: `favorite_${m[1]}`, value: capitalize(m[2]) };

  m = lower.match(/^i prefer (.+)$/);
  if (m) return { category: "preference", key: "prefers", value: capitalize(m[1]) };

  m = lower.match(/^(?:my )?main project is (.+)$/);
  if (m) return { category: "project", key: "main_project", value: capitalize(m[1]) };

  m = lower.match(/^i use (.+)$/);
  if (m) return { category: "fact", key: "uses", value: capitalize(m[1]) };

  m = lower.match(/^i(?:'m| am) (.+)$/);
  if (m) return { category: "fact", key: "is", value: capitalize(m[1]) };

  return { category: "fact", key: fact.slice(0, 40), value: capitalize(fact) };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
