// The Again / Hard / Good / Easy rating row. Ported from the study/view/* composables.
import { StyleSheet, View } from 'react-native';
import { CardEase } from '@/domain/cardState';
import { Btn } from '@/study/components/Btn';

const EASES: { ease: CardEase; label: string }[] = [
  { ease: CardEase.Again, label: 'Again' },
  { ease: CardEase.Hard, label: 'Hard' },
  { ease: CardEase.Good, label: 'Good' },
  { ease: CardEase.Easy, label: 'Easy' },
];

export function AnswerButtons({ onAnswer }: { onAnswer: (ease: CardEase) => void }) {
  return (
    <View style={styles.answerRow}>
      {EASES.map(({ ease, label }) => (
        <Btn key={label} label={label} onPress={() => onAnswer(ease)} style={styles.flex1} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  answerRow: { flexDirection: 'row', paddingHorizontal: 4, paddingVertical: 6 },
  flex1: { flex: 1 },
});
