// Popup for assigning a kanji OR a word to existing lists, or creating a new list.
import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';

import {
  addKanjiToList,
  addWordToList,
  createList,
  deleteList,
  KanjiListSummary,
  removeKanjiFromList,
  removeWordFromList,
  renameList,
} from '@/data/repository/lists';
import { confirmDestructive } from '@/ui/confirm';
import { NewListRow } from '@/ui/NewListRow';
import { usePalette } from '@/ui/theme';

/** What the modal is adding to lists: a single kanji character or a word (by id). */
export type ListTarget =
  | { kind: 'kanji'; character: string }
  | { kind: 'word'; id: number; label: string };

export function AddToListModal({
  visible,
  target,
  lists,
  memberOf,
  onChange,
  onClose,
}: {
  visible: boolean;
  target: ListTarget;
  lists: KanjiListSummary[];
  memberOf: Set<number>;
  onChange: (memberOf: Set<number>, lists: KanjiListSummary[]) => void;
  onClose: () => void;
}) {
  const p = usePalette();
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const addToList = (listId: number) =>
    target.kind === 'kanji'
      ? addKanjiToList(listId, target.character)
      : addWordToList(listId, target.id);
  const removeFromList = (listId: number) =>
    target.kind === 'kanji'
      ? removeKanjiFromList(listId, target.character)
      : removeWordFromList(listId, target.id);
  const targetLabel = target.kind === 'kanji' ? target.character : target.label;

  const toggle = async (listId: number) => {
    const next = new Set(memberOf);
    if (next.has(listId)) {
      next.delete(listId);
      await removeFromList(listId);
    } else {
      next.add(listId);
      await addToList(listId);
    }
    onChange(next, lists);
  };

  const promptManage = (list: KanjiListSummary) => {
    Alert.alert(list.name, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Rename',
        onPress: () => {
          setRenameDraft(list.name);
          setRenamingId(list.id);
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          confirmDestructive({
            title: 'Delete list',
            message: `Delete "${list.name}"? This cannot be undone.`,
            onConfirm: async () => {
              await deleteList(list.id);
              const nextLists = lists.filter((l) => l.id !== list.id);
              const nextMembers = new Set(memberOf);
              nextMembers.delete(list.id);
              onChange(nextMembers, nextLists);
            },
          }),
      },
    ]);
  };

  const submitRename = async () => {
    if (renamingId == null) return;
    const trimmed = renameDraft.trim();
    const current = lists.find((l) => l.id === renamingId);
    setRenamingId(null);
    setRenameDraft('');
    if (!trimmed || !current || trimmed === current.name) return;
    await renameList(renamingId, trimmed);
    const nextLists = lists.map((l) => (l.id === renamingId ? { ...l, name: trimmed } : l));
    onChange(memberOf, nextLists);
  };

  const submitNew = async (name: string) => {
    const id = await createList(name);
    await addToList(id);
    const nextLists: KanjiListSummary[] = [
      { id, name, createdAt: Date.now(), memberCount: 1 },
      ...lists,
    ];
    const nextMembers = new Set(memberOf);
    nextMembers.add(id);
    onChange(nextMembers, nextLists);
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: p.background }]} onPress={() => {}}>
          <Text style={[styles.title, { color: p.text }]}>{`Add ${targetLabel} to list`}</Text>

          {lists.length === 0 ? (
            <Text style={[styles.empty, { color: p.textSecondary }]}>
              No lists yet. Create one below.
            </Text>
          ) : (
            <ScrollView style={styles.scroll} contentContainerStyle={styles.chipRow}>
              {lists.map((l) => {
                if (renamingId === l.id) {
                  return (
                    <TextInput
                      key={l.id}
                      value={renameDraft}
                      onChangeText={setRenameDraft}
                      onSubmitEditing={submitRename}
                      onBlur={submitRename}
                      autoFocus
                      returnKeyType="done"
                      style={[
                        styles.chip,
                        styles.renameInput,
                        { color: p.text, borderColor: p.primary },
                      ]}
                    />
                  );
                }
                const checked = memberOf.has(l.id);
                return (
                  <Pressable
                    key={l.id}
                    onPress={() => toggle(l.id)}
                    onLongPress={() => promptManage(l)}
                    style={[
                      styles.chip,
                      {
                        borderColor: checked ? p.primary : p.border,
                        backgroundColor: checked ? p.primary : 'transparent',
                      },
                    ]}
                  >
                    <Text style={[styles.chipLabel, { color: checked ? p.onPrimary : p.text }]}>
                      {`${checked ? '✓ ' : ''}${l.name}`}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          <NewListRow onCreate={submitNew} style={styles.createRow} />

          <Pressable onPress={onClose} style={styles.doneBtn} hitSlop={8}>
            <Text style={[styles.doneLabel, { color: p.primary }]}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 16,
  },
  card: { borderRadius: 16, padding: 16, maxHeight: '80%' },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  empty: { fontSize: 14, paddingVertical: 12 },
  scroll: { maxHeight: 280 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  chipLabel: { fontSize: 13, fontWeight: '600' },
  renameInput: { fontSize: 13, fontWeight: '600', minWidth: 100, paddingVertical: 4 },
  createRow: { marginTop: 12 },
  doneBtn: { alignSelf: 'flex-end', paddingTop: 12, paddingHorizontal: 4 },
  doneLabel: { fontSize: 15, fontWeight: '600' },
});
