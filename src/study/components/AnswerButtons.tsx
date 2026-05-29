// The Again / Hard / Good / Easy rating row. Ported from the study/view/* composables.
import { StyleSheet, View } from 'react-native';
import { CardEase } from '@/domain/cardState';
import { Btn } from '@/study/components/Btn';
import { Palette, usePalette } from '@/ui/theme';

// Color-coded by difficulty so the row is read by hue (red→green), the way Anki users learn it.
const EASES: { ease: CardEase; label: string; color: (p: Palette) => string }[] = [
  { ease: CardEase.Again, label: 'Again', color: (p) => p.danger },
  { ease: CardEase.Hard, label: 'Hard', color: (p) => p.warning },
  { ease: CardEase.Good, label: 'Good', color: (p) => p.success },
  { ease: CardEase.Easy, label: 'Easy', color: (p) => p.primary },
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
  const p = usePalette();
  return (
    <View style={styles.answerRow}>
      {EASES.map(({ ease, label, color }) => {
        const filled = selected === ease || (!select && selected === undefined);
        return (
          <Btn
            key={label}
            label={label}
            variant={filled ? 'filled' : 'outlined'}
            color={color(p)}
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
