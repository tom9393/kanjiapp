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

// Answer rows (the default) keep every button filled — tapping one submits immediately. Pick rows
// (the individual word rating) pass `select`: buttons start outlined and only the chosen ease fills,
// so the selection is visible and an unrated kanji reads as untouched.
export function AnswerButtons({
  onAnswer,
  selected,
  select,
}: {
  onAnswer: (ease: CardEase) => void;
  selected?: CardEase;
  select?: boolean;
}) {
  return (
    <View style={styles.answerRow}>
      {EASES.map(({ ease, label }) => {
        const filled = selected === ease || (!select && selected === undefined);
        return (
          <Btn
            key={label}
            label={label}
            variant={filled ? 'filled' : 'outlined'}
            onPress={() => onAnswer(ease)}
            style={styles.flex1}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  answerRow: { flexDirection: 'row', paddingHorizontal: 4, paddingVertical: 6 },
  flex1: { flex: 1 },
});
