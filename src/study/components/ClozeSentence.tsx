// Example sentence with the target word emphasised in place ("in-place, half hidden"): writing
// mode renders the word as kana (the kanji is what you must produce), reading mode renders its
// kanji with no furigana (you must produce the reading). The target span is highlighted so the
// user knows which word to answer. Used as the prompt in the word-review flows.
import { Fragment } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { ExampleSentence, Word } from '@/data/types';
import { usePalette } from '@/ui/theme';

export function ClozeSentence({
  sentence,
  word,
  mode,
  style,
}: {
  sentence: ExampleSentence;
  word: Word;
  mode: 'reading' | 'writing';
  style?: ViewStyle;
}) {
  const p = usePalette();
  const token = mode === 'writing' ? word.kana : word.kanjiForm;
  // Sentences store the kanji form, so split on it; the gaps between parts are where it appeared.
  const parts = sentence.japanese.split(word.kanjiForm);

  return (
    <View style={[styles.card, { backgroundColor: p.surfaceVariant }, style]}>
      <Text style={[styles.jp, { color: p.text }]}>
        {parts.map((part, i) => (
          <Fragment key={i}>
            {part}
            {i < parts.length - 1 && (
              <Text style={[styles.target, { color: p.primary }]}>{token}</Text>
            )}
          </Fragment>
        ))}
      </Text>
      <Text style={[styles.en, { color: p.textSecondary }]}>{sentence.english}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  jp: { fontSize: 22, lineHeight: 34 },
  target: { fontWeight: '800', textDecorationLine: 'underline' },
  en: { fontSize: 13, marginTop: 8 },
});
