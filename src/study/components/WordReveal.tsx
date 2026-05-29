// The revealed answer for a word-review card: the full (unmasked) word + sentence + meaning,
// then a rating step that updates SRS for every kanji in the word. Group mode (default) gives the
// whole word one rating; individual mode (the rateKanjiIndividually setting) lists each kanji
// top-down with its own rating row and a Submit once all are rated.
import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CardEase } from '@/domain/cardState';
import { ReviewWord } from '@/domain/models';
import { getRateKanjiIndividually } from '@/settings/settingsProvider';
import { useSetting } from '@/settings/useSetting';
import { AnswerButtons } from '@/study/components/AnswerButtons';
import { Btn } from '@/study/components/Btn';
import { Readings } from '@/study/components/Readings';
import { SentenceCard } from '@/study/components/SentenceCard';
import { Furigana } from '@/ui/Furigana';
import { usePalette } from '@/ui/theme';

export function WordReveal({
  reviewWord,
  onSubmit,
}: {
  reviewWord: ReviewWord;
  onSubmit: (eases: Map<string, CardEase>) => void;
}) {
  const p = usePalette();
  // Default off (group) until the setting resolves — matches the pref default, so no wrong flash.
  const individual = useSetting(getRateKanjiIndividually) ?? false;
  const { word, sentence, constituents } = reviewWord;
  const [picks, setPicks] = useState<Map<string, CardEase>>(new Map());
  const allRated = picks.size === constituents.length;

  const rateAll = (ease: CardEase) =>
    onSubmit(new Map(constituents.map((k) => [k.kanji.character, ease])));
  const pick = (character: string, ease: CardEase) =>
    setPicks((prev) => new Map(prev).set(character, ease));

  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => {}}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: p.background }]}>
          {/* Blocks are direct children of the scroll so alignSelf:'stretch' resolves against its
              definite width; the rating action is pinned below, mirroring the group layout. */}
          <ScrollView contentContainerStyle={styles.scroll}>
            <Furigana form={word.kanjiForm} reading={word.kana} size={40} />
            <Text style={[styles.meaning, { color: p.textSecondary }]}>{word.meaning}</Text>
            <SentenceCard sentence={sentence} style={styles.block} />
            {individual &&
              constituents.map((k) => (
                <View key={k.kanji.character} style={[styles.kanjiBlock, { borderColor: p.border }]}>
                  <View style={styles.kanjiHeader}>
                    <Text style={[styles.kanjiGlyph, { color: p.text }]}>{k.kanji.character}</Text>
                    <View style={styles.flex1}>
                      <Readings kanji={k.kanji} />
                    </View>
                  </View>
                  <AnswerButtons
                    select
                    selected={picks.get(k.kanji.character)}
                    onAnswer={(e) => pick(k.kanji.character, e)}
                  />
                </View>
              ))}
          </ScrollView>

          {individual ? (
            <Btn
              label={allRated ? 'Submit' : 'Rate every kanji'}
              disabled={!allRated}
              onPress={() => onSubmit(picks)}
              style={styles.submit}
            />
          ) : (
            <AnswerButtons onAnswer={rateAll} />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  block: { alignSelf: 'stretch', marginTop: 12 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 },
  card: { borderRadius: 16, padding: 16, maxHeight: '88%' },
  scroll: { alignItems: 'center', paddingBottom: 12 },
  meaning: { fontSize: 14, marginTop: 6, textAlign: 'center' },
  kanjiBlock: { alignSelf: 'stretch', borderWidth: 1, borderRadius: 12, padding: 10, marginTop: 10 },
  kanjiHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  kanjiGlyph: { fontSize: 40, fontWeight: '700' },
  submit: { marginTop: 8 },
});
