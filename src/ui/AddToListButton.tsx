// The "Add to list / In N lists — edit" button + its modal, shared by the kanji and word detail
// screens. Owns the modal's open state; the parent keeps the membership it renders and updates it
// through onChange.
import { useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { KanjiListSummary } from '@/data/repository/lists';
import { AddToListModal, ListTarget } from '@/ui/AddToListModal';
import { usePalette } from '@/ui/theme';

export function AddToListButton({
  target,
  lists,
  memberOf,
  onChange,
  style,
}: {
  target: ListTarget;
  lists: KanjiListSummary[];
  memberOf: Set<number>;
  onChange: (memberOf: Set<number>, lists: KanjiListSummary[]) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  const [open, setOpen] = useState(false);
  const count = memberOf.size;
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.button,
          { borderColor: p.border, backgroundColor: p.surfaceVariant },
          style,
          pressed && { opacity: 0.7 },
        ]}
      >
        <Text style={[styles.label, { color: p.text }]}>
          {count === 0 ? '+ Add to list' : `In ${count} list${count === 1 ? '' : 's'} — edit`}
        </Text>
      </Pressable>
      <AddToListModal
        visible={open}
        target={target}
        lists={lists}
        memberOf={memberOf}
        onChange={onChange}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'stretch',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  label: { fontSize: 15, fontWeight: '600' },
});
