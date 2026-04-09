/**
 * Parse notes chứa dòng dạng [dd/mm/yyyy HH:MM] user: text (mỗi dòng cách nhau \\n\\n)
 */
export function parseConversationBlocks(notes) {
  if (!notes || !String(notes).trim()) return [];
  const parts = String(notes).split(/\n\n+/);
  return parts
    .map((block) => {
      const m = block.trim().match(/^\[(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2})\]\s*([^:]+):\s*([\s\S]*)$/);
      if (m) return { at: m[1], user: m[2].trim(), text: m[3].trim() };
      return { at: "", user: "", text: block.trim() };
    })
    .filter((x) => x.text);
}
