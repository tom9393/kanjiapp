// Recursive kanji radical breakdown (線 → 糸 + 泉 → 白 + 水 …), read from the IDS
// decomposition asset. Each component that is a known kanji is tappable and opens its own
// detail. The "Decompose to primitives" setting controls whether the tree stops at known
// kanji (default) or expands every component down to its atomic parts and strokes.
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { componentsOf, decompositionClosure } from '@/data/decomposition';
import { getKanjiByCharacters } from '@/data/repository/kanji';
import { Kanji } from '@/data/types';
import { Prefs } from '@/settings/preferences';
import { getDecomposeToPrimitives } from '@/settings/settingsProvider';
import { useSetting } from '@/settings/useSetting';
import { usePalette } from '@/ui/theme';

// Components shown under a node: all of them in primitives mode, only known kanji otherwise.
function visibleChildren(char: string, primitives: boolean, known: Map<string, Kanji>): string[] {
  const children = componentsOf(char);
  return primitives ? children : children.filter((c) => known.has(c));
}

export function RadicalTree({ character }: { character: string }) {
  const router = useRouter();
  const p = usePalette();
  const primitives = useSetting(getDecomposeToPrimitives) ?? Prefs.decomposeToPrimitives.default;
  const [known, setKnown] = useState<Map<string, Kanji>>(new Map());

  useEffect(() => {
    if (componentsOf(character).length === 0) return;
    (async () => {
      const rows = await getKanjiByCharacters(decompositionClosure(character));
      setKnown(new Map(rows.map((k) => [k.character, k])));
    })();
  }, [character]);

  const roots = useMemo(
    () => visibleChildren(character, primitives, known),
    [character, primitives, known],
  );

  // Nothing to show for atomic kanji, or before the kanji lookup resolves in kanji-only mode.
  if (roots.length === 0) return null;

  const open = (c: string) => router.push({ pathname: '/kanji/[character]', params: { character: c } });

  return (
    <View style={[styles.card, { backgroundColor: p.surfaceVariant }]}>
      <Text style={[styles.title, { color: p.text }]}>Radicals</Text>
      {roots.map((c, i) => (
        <Node key={`${c}-${i}`} char={c} primitives={primitives} known={known} path={[character]} onPress={open} />
      ))}
    </View>
  );
}

function Node({
  char,
  primitives,
  known,
  path,
  onPress,
}: {
  char: string;
  primitives: boolean;
  known: Map<string, Kanji>;
  path: string[];
  onPress: (c: string) => void;
}) {
  const p = usePalette();
  const kanji = known.get(char);
  const children = path.includes(char) ? [] : visibleChildren(char, primitives, known); // guard cycles

  return (
    <View>
      <Pressable
        disabled={!kanji}
        onPress={() => onPress(char)}
        style={({ pressed }) => [styles.row, pressed && kanji && { opacity: 0.6 }]}
      >
        <Text style={[styles.glyph, { color: kanji ? p.text : p.textSecondary }]}>{char}</Text>
        {kanji && (
          <Text style={[styles.meaning, { color: p.textSecondary }]} numberOfLines={1}>
            {kanji.meanings.split(',')[0]}
          </Text>
        )}
      </Pressable>
      {children.length > 0 && (
        <View style={[styles.children, { borderLeftColor: p.border }]}>
          {children.map((c, i) => (
            <Node
              key={`${c}-${i}`}
              char={c}
              primitives={primitives}
              known={known}
              path={[...path, char]}
              onPress={onPress}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: 'stretch', borderRadius: 12, padding: 16, marginTop: 16 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  glyph: { fontSize: 26 },
  meaning: { fontSize: 13, flexShrink: 1 },
  children: { marginLeft: 13, paddingLeft: 13, borderLeftWidth: StyleSheet.hairlineWidth },
});
