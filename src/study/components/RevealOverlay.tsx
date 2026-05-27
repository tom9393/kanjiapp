// The revealed answer (big glyph + readings + optional sentence) shown over the prompt.
// Ported from the study/view/* composables.
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ExampleSentence, Kanji } from '@/data/types';
import { CardEase } from '@/domain/cardState';
import { AnswerButtons } from '@/study/components/AnswerButtons';
import { MetaChips } from '@/study/components/MetaChips';
import { Readings } from '@/study/components/Readings';
import { SentenceCard } from '@/study/components/SentenceCard';
import { usePalette } from '@/ui/theme';

export function RevealOverlay({
  kanji,
  sentence,
  onAnswer,
}: {
  kanji: Kanji;
  sentence: ExampleSentence | null;
  onAnswer: (ease: CardEase) => void;
}) {
  const p = usePalette();
  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => {}}>
      <View style={styles.backdrop}>
        <View style={[styles.revealCard, { backgroundColor: p.background }]}>
          <ScrollView contentContainerStyle={styles.revealScroll}>
            <Text style={[styles.bigGlyph, { color: p.text }]}>{kanji.character}</Text>
            <MetaChips grade={kanji.grade} strokes={kanji.strokes} kanken={kanji.kanken} />
            <Readings kanji={kanji} style={styles.gap8} />
            {sentence && <SentenceCard sentence={sentence} style={styles.gap8} />}
          </ScrollView>
          <AnswerButtons onAnswer={onAnswer} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  gap8: { marginTop: 8 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 },
  revealCard: { borderRadius: 16, padding: 16, maxHeight: '85%' },
  revealScroll: { alignItems: 'center', paddingBottom: 12 },
  bigGlyph: { fontSize: 96, fontWeight: '700' },
});
