import { env, capabilities } from "../env.js";

export const searchUnavailableMessage =
  "Live web search is unavailable right now, so I can't verify current information on that.";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export function isSearchAvailable(): boolean {
  return capabilities.search;
}

// Deliberately a plain keyword heuristic rather than an extra AI
// classification call: zero added latency/cost on every message, and the
// categories requested (current events, weather, live scores/prices,
// explicit search requests) are the kind of phrasing this catches
// reliably. False negatives just fall back to the normal AI path (correct,
// if slightly conservative); false positives cost one extra search call
// that the AI is free to ignore if irrelevant.
const SEARCH_TRIGGER_PATTERN = new RegExp(
  [
    "\\btoday'?s?\\b",
    "\\btonight\\b",
    "\\bright now\\b",
    "\\bcurrently\\b",
    "\\bcurrent (?:events?|news|price|prices|weather|score|standings)\\b",
    "\\blatest\\b",
    "\\brecent(?:ly)?\\b",
    "\\bup[- ]to[- ]date\\b",
    "\\bthis (?:week|weekend|month|year)\\b",
    "\\byesterday\\b",
    "\\bweather\\b",
    "\\bforecast\\b",
    "\\btemperature (?:in|today|now)\\b",
    "\\bnews\\b",
    "\\bheadlines?\\b",
    "\\bbreaking\\b",
    "\\b(?:who won|final score|match result|game result|live score)\\b",
    "\\bstandings\\b",
    "\\bprice of\\b",
    "\\bstock price\\b",
    "\\bexchange rate\\b",
    "\\bhow much (?:is|does|costs?)\\b",
    "\\bsearch (?:the web|online|for)\\b",
    "\\blook up\\b",
    "\\bgoogle (?:it|that|this)\\b",
    "\\bfind out online\\b",
    "\\bcheck online\\b",
  ].join("|"),
  "i"
);

/** Heuristic only — see SEARCH_TRIGGER_PATTERN. Never throws. */
export function needsWebSearch(message: string): boolean {
  return SEARCH_TRIGGER_PATTERN.test(message);
}

interface TavilyResult {
  title?: string;
  url?: string;
  content?: string;
}

interface TavilyResponse {
  results?: TavilyResult[];
}

/**
 * Web search via Tavily, server-side only — the API key never leaves this
 * module (never sent to the client, never logged, never echoed back in an
 * error). Callers only ever see abstract SearchResult objects; provider
 * identity is not part of the return shape, so nothing upstream can
 * accidentally surface "Tavily" to the end user.
 */
export async function searchWeb(query: string): Promise<SearchResult[]> {
  if (!capabilities.search) throw new Error(searchUnavailableMessage);

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.TAVILY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      max_results: 5,
      search_depth: "basic",
    }),
  });

  if (!response.ok) {
    // Log server-side only; never forward raw provider/status text to the
    // client, since it may reveal implementation/provider details.
    const body = await response.text().catch(() => "");
    console.error(`[search] Tavily error ${response.status}: ${body.slice(0, 500)}`);
    throw new Error(searchUnavailableMessage);
  }

  const data = (await response.json()) as TavilyResponse;
  return (data.results ?? [])
    .filter((r): r is Required<TavilyResult> => Boolean(r.title && r.url))
    .map((r) => ({ title: r.title, url: r.url, snippet: r.content ?? "" }));
}
