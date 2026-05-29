// The "Add to list / In N lists — edit" button + its modal, shared by the kanji and word detail
// screens. Loads all lists and which of them already contain the target on mount, and owns both
// the modal's open state and that membership — the modal mutates it in place via onChange.
import { useEffect, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import {
  getLists,
  getListIdsContaining,
  getListIdsContainingWord,
  KanjiListSummary,
} from '@/data/repository/lists';
import { AddToListModal, ListTarget } from '@/ui/AddToListModal';
import { usePalette } from '@/ui/theme';

export function AddToListButton({
  target,
  style,
}: {
  target: ListTarget;
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<KanjiListSummary[]>([]);
  const [memberOf, setMemberOf] = useState<Set<number>>(new Set());

  const targetKey = target.kind === 'kanji' ? target.character : target.id;
  useEffect(() => {
    let active = true;
    const containing =
      target.kind === 'kanji'
        ? getListIdsContaining(target.character)
        : getListIdsContainingWord(target.id);
    Promise.all([getLists(), containing]).then(([allLists, inLists]) => {
      if (!active) return;
      setLists(allLists);
      setMemberOf(inLists);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.kind, targetKey]);

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
        onChange={(nextMembers, nextLists) => {
          setMemberOf(nextMembers);
          setLists(nextLists);
        }}
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
