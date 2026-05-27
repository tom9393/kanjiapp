// Learning phase 3: show the answer and collect a self-rating. Ported from study/view/Rating.
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStudyStore } from '@/state/studyStore';
import { AnswerButtons } from '@/study/components/AnswerButtons';
import { MetaChips } from '@/study/components/MetaChips';
import { Readings } from '@/study/components/Readings';
import { SentenceCard } from '@/study/components/SentenceCard';
import { flowStyles } from '@/study/flows/styles';
import { usePalette } from '@/ui/theme';

export function Rating() {
  const card = useStudyStore((s) => s.currentCard());
  const submitAnswer = useStudyStore((s) => s.submitAnswer);
  const p = usePalette();
  const kanji = card.card.kanji;
  const sentence = card.examples[0]?.sentence ?? null;

  return (
    <View style={flowStyles.fill}>
      <ScrollView style={flowStyles.flex1} contentContainerStyle={styles.ratingScroll}>
        <Text style={[flowStyles.bigGlyph, { color: p.text }]}>{kanji.character}</Text>
        <MetaChips grade={kanji.grade} strokes={kanji.strokes} kanken={kanji.kanken} />
        <View style={[flowStyles.alignStart, flowStyles.gap8]}>
          <Readings kanji={kanji} />
          {sentence && <SentenceCard sentence={sentence} style={flowStyles.gap8} />}
        </View>
      </ScrollView>
      <AnswerButtons onAnswer={submitAnswer} />
    </View>
  );
}

const styles = StyleSheet.create({
  ratingScroll: { alignItems: 'center', padding: 16 },
});
