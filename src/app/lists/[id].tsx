// List detail: study the list, add/remove kanji or words, rename, delete. Tapping a kanji
// chip opens the kanji detail; long-press prompts to remove from this list. Word entries
// are rendered in a separate section below the kanji grid.
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  deleteList,
  getList,
  getListMembers,
  getListWords,
  KanjiList,
  removeKanjiFromList,
  removeWordFromList,
  renameList,
} from '@/data/repository/lists';
import { byFrequency, KanjiWithSrs, Word } from '@/data/types';
import { LoadRequest } from '@/state/studyStore';
import { Btn } from '@/study/components/Btn';
import { confirmDestructive } from '@/ui/confirm';
import { Furigana } from '@/ui/Furigana';
import { KanjiGrid } from '@/ui/KanjiGrid';
import { useNav } from '@/ui/nav';
import { Loading, NotFound } from '@/ui/screenStates';
import { usePalette } from '@/ui/theme';

export default function ListDetail() {
  const router = useRouter();
  const p = usePalette();
  const { kanji: openKanji, word: openWord } = useNav();
  const params = useLocalSearchParams<{ id: string }>();
  const listId = Number(params.id);

  const [list, setList] = useState<KanjiList | null | undefined>(undefined);
  const [members, setMembers] = useState<KanjiWithSrs[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState('');

  const refresh = useCallback(() => {
    let active = true;
    Promise.all([getList(listId), getListMembers(listId), getListWords(listId)]).then(
      ([l, m, w]) => {
        if (!active) return;
        m.sort(byFrequency);
        setList(l);
        setMembers(m);
        setWords(w);
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [listId]);

  useFocusEffect(refresh);

  if (list === undefined) return <Loading />;
  if (list === null) return <NotFound label="List not found." />;

  const startStudy = () => {
    const req: LoadRequest = { kind: 'list', listId };
    router.push({ pathname: '/study', params: { req: JSON.stringify(req) } });
  };

  const confirmRemove = (character: string) =>
    confirmDestructive({
      title: 'Remove kanji',
      message: `Remove ${character} from "${list.name}"?`,
      confirmLabel: 'Remove',
      onConfirm: async () => {
        await removeKanjiFromList(listId, character);
        refresh();
      },
    });

  const confirmRemoveWord = (word: Word) =>
    confirmDestructive({
      title: 'Remove word',
      message: `Remove ${word.kanjiForm} from "${list.name}"?`,
      confirmLabel: 'Remove',
      onConfirm: async () => {
        await removeWordFromList(listId, word.id);
        refresh();
      },
    });

  const confirmDelete = () =>
    confirmDestructive({
      title: 'Delete list',
      message: `Delete "${list.name}"? This cannot be undone.`,
      onConfirm: async () => {
        await deleteList(listId);
        router.back();
      },
    });

  const submitRename = async () => {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== list.name) {
      await renameList(listId, trimmed);
    }
    setRenaming(false);
    refresh();
  };

  return (
    <View style={[styles.fill, { backgroundColor: p.background }]}>
      <View style={styles.header}>
        {renaming ? (
          <TextInput
            value={draftName}
            onChangeText={setDraftName}
            onSubmitEditing={submitRename}
            onBlur={submitRename}
            autoFocus
            returnKeyType="done"
            style={[styles.title, styles.titleInput, { color: p.text, borderColor: p.border }]}
          />
        ) : (
          <Pressable
            onPress={() => {
              setDraftName(list.name);
              setRenaming(true);
            }}
            style={styles.titleWrap}
          >
            <Text style={[styles.title, { color: p.text }]} numberOfLines={1}>
              {list.name}
            </Text>
            <Text style={[styles.editHint, { color: p.textSecondary }]}>Tap to rename</Text>
          </Pressable>
        )}
        <Text style={[styles.subheader, { color: p.textSecondary }]}>
          {countLabel(members.length, words.length)}
        </Text>

        <View style={styles.actions}>
          <Btn
            label="Study"
            onPress={startStudy}
            disabled={members.length === 0 && words.length === 0}
            style={styles.actionBtn}
          />
          <Btn
            label="Add kanji"
            variant="outlined"
            onPress={() =>
              router.push({ pathname: '/lists/[id]/add', params: { id: String(listId) } })
            }
            style={styles.actionBtn}
          />
          <Btn label="Delete" variant="outlined" onPress={confirmDelete} style={styles.actionBtn} />
        </View>
      </View>

      {members.length === 0 && words.length === 0 && !loading ? (
        <Text style={[styles.empty, { color: p.textSecondary }]}>
          Empty list. Tap "Add kanji" to start, or open a word and tap "Add to list".
        </Text>
      ) : (
        <KanjiGrid
          kanji={members}
          loading={loading}
          onPress={openKanji}
          onLongPress={confirmRemove}
          footer={
            words.length > 0 && (
              <View style={styles.wordsSection}>
                <Text style={[styles.wordsTitle, { color: p.textSecondary }]}>Words</Text>
                {words.map((w) => (
                  <Pressable
                    key={w.id}
                    onPress={() => openWord(w.id)}
                    onLongPress={() => confirmRemoveWord(w)}
                    style={({ pressed }) => [
                      styles.wordRow,
                      { borderColor: p.border, backgroundColor: pressed ? p.surfaceVariant : 'transparent' },
                    ]}
                  >
                    <Furigana form={w.kanjiForm} reading={w.kana} size={18} />
                    <Text style={[styles.wordMeaning, { color: p.textSecondary }]} numberOfLines={1}>
                      {w.meaning}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )
          }
        />
      )}
    </View>
  );
}

function countLabel(kanjiCount: number, wordCount: number): string {
  if (kanjiCount === 0 && wordCount === 0) return 'Empty';
  if (wordCount === 0) return `${kanjiCount} kanji`;
  if (kanjiCount === 0) return `${wordCount} word${wordCount === 1 ? '' : 's'}`;
  return `${kanjiCount} kanji · ${wordCount} word${wordCount === 1 ? '' : 's'}`;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  titleWrap: { paddingVertical: 4 },
  title: { fontSize: 20, fontWeight: '700' },
  titleInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  editHint: { fontSize: 11, marginTop: 2 },
  subheader: { fontSize: 13, marginTop: 2, marginBottom: 10 },
  actions: { flexDirection: 'row', gap: 4, marginHorizontal: -4 },
  actionBtn: { flex: 1 },
  empty: { fontSize: 14, textAlign: 'center', paddingHorizontal: 32, paddingTop: 24 },
  wordsSection: { paddingHorizontal: 4, paddingTop: 10 },
  wordsTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, paddingBottom: 6 },
  wordRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 6,
  },
  wordMeaning: { fontSize: 13, paddingTop: 2 },
});
