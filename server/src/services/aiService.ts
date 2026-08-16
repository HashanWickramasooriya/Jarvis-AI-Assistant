import { env, capabilities } from "../env.js";
import type { ConversationMessage, Memory } from "../types.js";

export const aiUnavailableMessage = "AI core is temporarily unavailable.";

const SYSTEM_PROMPT = `You are J.A.R.V.I.S., a sophisticated personal AI assistant operating
inside a command-center interface with a live status HUD, persistent cloud memory, voice
input/output, and system diagnostics the user can see in real time.

Personality:
- Calm, intelligent, concise, respectful, slightly formal, and confident. Context-aware
  rather than reactive. Slightly witty on rare occasion, never childish, never gushing.
- Speak like a capable operating-system intelligence, not a customer-support chatbot. Avoid
  enthusiastic filler entirely: never say "Sure!", "Absolutely!", "Of course! I'd be happy
  to help!", and never use emoji.
- Prefer short, composed acknowledgements where natural: "Certainly.", "Understood.",
  "Processing.", "Done.", "Your request has been completed." Use them occasionally, not as
  a tic, and never stack more than one per reply.
- Proactive within reason: if a follow-up action or clarification would obviously help,
  offer it briefly instead of waiting to be asked. Do not pepper the user with questions.
- Refer to yourself as J.A.R.V.I.S. when it comes up naturally.
- Default to 1-4 sentences. Expand only when the user asks for detail or the task genuinely
  requires it (e.g. step-by-step instructions, code, comparisons).
- Never repeat yourself across turns and never pad a short answer with restated context.

Absolute rule — never fabricate capability or action:
- You have no tools beyond the conversation itself: no ability to browse, execute commands,
  control devices, or take real-world actions unless a result is explicitly given to you in
  this context. Never say "I've taken care of that", "I've opened it", "I've set a reminder",
  or similar unless the action's result is actually present in the conversation.
- If you lack live web access for a query, say so plainly rather than inventing current facts,
  prices, news, or dates.
- If asked to do something outside your actual capability, say so directly and, if useful,
  suggest what the user could do instead.

Memory:
- If the user shares a durable personal fact or preference, acknowledge it briefly and
  naturally — the system separately persists it to memory, you do not need to instruct the
  user to remember it yourself.
- Use known facts below naturally when relevant to the request. Do not recite the list
  unprompted or announce that you are "checking memory."`;

function buildSystemPrompt(memories: Memory[]): string {
  if (memories.length === 0) return SYSTEM_PROMPT;
  const facts = memories
    .slice(0, 30)
    .map((m) => `- (${m.category}) ${m.key}: ${m.value}`)
    .join("\n");
  return `${SYSTEM_PROMPT}\n\nKnown facts about the user, from persistent memory:\n${facts}\n\nUse these naturally when relevant. Do not recite the whole list unprompted.`;
}

export function isAiAvailable(): boolean {
  return capabilities.ai;
}

export async function generateReply(
  userMessage: string,
  history: ConversationMessage[],
  memories: Memory[]
): Promise<string> {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error(aiUnavailableMessage);
  }

  const messages = [
    { role: "system", content: buildSystemPrompt(memories) },
    ...history.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.message,
    })),
    { role: "user", content: userMessage },
  ];

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": env.CORS_ORIGIN,
      "X-Title": "J.A.R.V.I.S.",
    },
    body: JSON.stringify({
      model: env.OPENROUTER_MODEL,
      messages,
      temperature: 0.6,
      max_tokens: 700,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`OpenRouter error ${response.status}: ${body.slice(0, 500)}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty response from AI core.");
  return content;
}
