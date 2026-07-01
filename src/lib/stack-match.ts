// Shared helper: match a text item against user stack_tags.
// Used by /feeds and dashboard Watch For You tile.

export type StackMatchable = {
  title: string;
  summary?: string | null;
  tags?: string[] | null;
};

export function matchStackTags(item: StackMatchable, stackTags: string[]): string[] {
  if (!stackTags || stackTags.length === 0) return [];
  const hay = `${item.title} ${item.summary ?? ""} ${(item.tags ?? []).join(" ")}`.toLowerCase();
  return stackTags.filter((tag) => {
    const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(hay);
  });
}
