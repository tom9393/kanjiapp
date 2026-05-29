// Learning phase 2: repeated handwriting practice across N rounds. Ported from
// study/view/Practice.
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Prefs } from '@/settings/preferences';
import { useSetting } from '@/settings/useSetting';
import { useStudyStore } from '@/state/studyStore';
import { Btn } from '@/study/components/Btn';
import { DrawingArea } from '@/study/components/DrawingArea';
import { Readings } from '@/study/components/Readings';
import { flowStyles } from '@/study/flows/styles';
import { usePalette } from '@/ui/theme';

export function Practice({ onFinished }: { onFinished: () => void }) {
  const card = useStudyStore((s) => s.currentCard());
  const total = useSetting(Prefs.learningRepetitions);
  const [round, setRound] = useState(0);
  const p = usePalette();
  const kanji = card.card.kanji;

  const handleNext = () => {
    const next = round + 1;
    if (next === total) onFinished();
    else setRound(next);
  };

  return (
    <View style={flowStyles.fill}>
      <View style={styles.practiceHeader}>
        <Text style={[styles.midGlyph, { color: p.text }]}>{kanji.character}</Text>
        <View style={flowStyles.flex1}>
          <Readings kanji={kanji} />
        </View>
      </View>

      <DrawingArea key={`${kanji.character}-${round}`} />

      <Text style={[styles.roundLabel, { color: p.textSecondary }]}>
        Round {round + 1} of {total}
      </Text>

      <View style={flowStyles.bottomRow}>
        <Btn label="Next" onPress={handleNext} style={flowStyles.flex1} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  practiceHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  midGlyph: { fontSize: 48, fontWeight: '700', marginRight: 16 },
  roundLabel: { fontSize: 13, textAlign: 'center', paddingTop: 4 },
});
