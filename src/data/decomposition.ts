// Kanji decomposition (radical breakdown) loaded from the prebuilt IDS asset.
// Maps a character to its immediate component characters (線 → [糸, 泉]); recurse through
// it to build the breakdown tree. Built by scripts/build-decomposition.mjs from cjkvi-ids.
export const decomposition = require('../../assets/data/kanji_decomposition.json') as Record<string, string[]>;

export function componentsOf(char: string): string[] {
  return decomposition[char] ?? [];
}

// Every character reachable from `char` through the decomposition map (cycle-guarded),
// so a tree's component membership can be resolved in one kanji lookup.
export function decompositionClosure(char: string): string[] {
  const seen = new Set<string>();
  const stack = [...componentsOf(char)];
  while (stack.length) {
    const c = stack.pop()!;
    if (seen.has(c)) continue;
    seen.add(c);
    for (const child of componentsOf(c)) if (!seen.has(child)) stack.push(child);
  }
  return [...seen];
}
