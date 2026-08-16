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

/**
 * Provider-agnostic web search. Swap the implementation here (or point
 * SEARCH_PROVIDER_URL/SEARCH_PROVIDER_API_KEY at a provider such as
 * Brave Search, Tavily, or SerpAPI) without touching any callers.
 */
export async function searchWeb(query: string): Promise<SearchResult[]> {
  if (!capabilities.search) throw new Error(searchUnavailableMessage);

  const url = new URL(env.SEARCH_PROVIDER_URL!);
  url.searchParams.set("q", query);

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${env.SEARCH_PROVIDER_API_KEY}` },
  });

  if (!response.ok) {
    throw new Error(`Search provider error ${response.status}`);
  }

  const data = (await response.json()) as { results?: SearchResult[] };
  return data.results ?? [];
}
