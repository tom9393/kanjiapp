// Learning phase 1: present the kanji with readings, an example, and the stroke-order
// diagram before practice. Ported from study/view/Presentation.
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStudyStore } from '@/state/studyStore';
import { Btn } from '@/study/components/Btn';
import { MetaChips } from '@/study/components/MetaChips';
import { Readings } from '@/study/components/Readings';
import { SentenceCard } from '@/study/components/SentenceCard';
import { StrokeOrderDiagram } from '@/study/components/StrokeOrderDiagram';
import { flowStyles } from '@/study/flows/styles';
import { usePalette } from '@/ui/theme';

export function Presentation({ onBegin }: { onBegin: () => void }) {
  const card = useStudyStore((s) => s.currentCard());
  const p = usePalette();
  const kanji = card.card.kanji;
  const sentence = card.examples[0]?.sentence ?? null;

  return (
    <View style={styles.fillPadded}>
      <ScrollView style={flowStyles.flex1} contentContainerStyle={{ alignItems: 'center' }}>
        <Text style={[flowStyles.bigGlyph, { color: p.text }]}>{kanji.character}</Text>
        <MetaChips grade={kanji.grade} strokes={kanji.strokes} kanken={kanji.kanken} />
        <View style={[flowStyles.alignStart, flowStyles.gap8]}>
          <Readings kanji={kanji} />
          {sentence && <SentenceCard sentence={sentence} style={flowStyles.gap8} />}
        </View>
        <View style={[styles.strokeWrap, flowStyles.gap12]}>
          <StrokeOrderDiagram character={kanji.character} />
        </View>
      </ScrollView>
      <Btn label="Begin Practice" onPress={onBegin} style={{ marginTop: 8 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  fillPadded: { flex: 1, padding: 16 },
  strokeWrap: { alignSelf: 'stretch' },
});
