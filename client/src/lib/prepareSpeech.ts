/**
 * Normalizes assistant text for TTS only — the UI always shows the
 * original, unmodified reply (ConversationPanel renders m.message as
 * plain text). Search-grounded and detailed answers routinely come back
 * with markdown (**bold**, bullet lists, links) that a TTS voice would
 * otherwise read literally ("asterisk asterisk... asterisk asterisk"),
 * and that literal syntax adds characters that count against the TTS
 * provider's usage without adding anything worth hearing.
 */
export function prepareForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ") // fenced code blocks: not meaningful spoken
    .replace(/`([^`]+)`/g, "$1") // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links: keep label, drop URL
    .replace(/^#{1,6}\s+/gm, "") // headers
    .replace(/\*\*([^*]+)\*\*/g, "$1") // bold
    .replace(/__([^_]+)__/g, "$1") // bold (underscore)
    .replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, "$1") // italic
    .replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, "$1") // italic (underscore)
    .replace(/^\s*[-*+]\s+/gm, "") // bullet markers
    .replace(/^\s*\d+\.\s+/gm, "") // numbered list markers
    .replace(/\n{2,}/g, ". ") // paragraph breaks -> a natural pause
    .replace(/\n/g, " ") // remaining single newlines -> space
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
