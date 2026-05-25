// Stroke-order paths, served from the prebuilt, read-only strokes.db. Ported from
// KanjiRepository.kt.
import { getStrokesDb } from '@/data/db';

/**
 * Stroke paths for a character, in stroke order — the `d` attributes KanjiVG defines.
 * Empty if the character has no diagram. The codepoint key matches parseStrokes() in
 * StrokeOrderDiagram.kt: the first code point as zero-padded, 5-digit lowercase hex.
 */
export async function getStrokes(character: string): Promise<string[]> {
  const codepoint = character.codePointAt(0)!.toString(16).padStart(5, '0');
  const db = await getStrokesDb();
  const row = await db.getFirstAsync<{ paths: string }>(
    'SELECT paths FROM stroke WHERE codepoint = ?',
    [codepoint],
  );
  return row ? (JSON.parse(row.paths) as string[]) : [];
}
