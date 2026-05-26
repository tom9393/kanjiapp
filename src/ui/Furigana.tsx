// Renders a word as furigana: each kanji run sits beneath its reading, okurigana beneath a blank
// line so the base characters share a baseline. Wraps when it outgrows its container.
import { StyleSheet, Text, TextStyle, View } from 'react-native';

import { splitFurigana } from '@/domain/furigana';
import { usePalette } from '@/ui/theme';

export function Furigana({
  form,
  reading,
  size = 18,
  weight = '600',
  color,
}: {
  form: string;
  reading: string;
  size?: number;
  weight?: TextStyle['fontWeight'];
  color?: string;
}) {
  const p = usePalette();
  const segments = splitFurigana(form, reading);

  return (
    <View style={styles.row}>
      {segments.map((seg, i) => (
        <View key={i} style={styles.col}>
          <Text style={[styles.rt, { color: p.textSecondary, fontSize: size * 0.55, lineHeight: size * 0.7 }]}>
            {seg.reading ?? ' '}
          </Text>
          <Text style={{ color: color ?? p.text, fontSize: size, fontWeight: weight }}>{seg.text}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' },
  col: { alignItems: 'center' },
  rt: { textAlign: 'center' },
});
