// DEV-ONLY admin panel for manually setting a kanji's SRS row. Gated behind __DEV__ so it is
// dead-stripped from production builds (Metro replaces __DEV__ with false → the panel branch is
// removed): the drawer link and Stack.Screen registration are gated the same way, and this route
// redirects home if it is somehow reached in a release build.
import { Redirect } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { deleteSrs, getAllKanjiWithSrs, upsertSrs } from '@/data/repository/kanji';
import { KanjiWithSrs, Srs, srsOf } from '@/data/types';
import { CardState } from '@/domain/cardState';
import { cardStateColors, usePalette } from '@/ui/theme';

const STATES: { state: CardState; label: string }[] = [
  { state: CardState.NEW, label: 'New' },
  { state: CardState.LEARNING, label: 'Learning' },
  { state: CardState.REVIEW, label: 'Review' },
  { state: CardState.RELEARNING, label: 'Relearning' },
];

const DAY = 86400;
const toNum = (s: string): number => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

const dueLabel = (due: number, now: number): string => {
  const d = Math.round((due - now) / DAY);
  if (d === 0) return 'due today';
  return d < 0 ? `${-d}d overdue` : `due in ${d}d`;
};

export default function AdminScreen() {
  // In production __DEV__ is false, so the panel never renders and the route bounces home.
  return __DEV__ ? <AdminPanel /> : <Redirect href="/" />;
}

function AdminPanel() {
  const p = usePalette();
  const [rows, setRows] = useState<KanjiWithSrs[]>([]);
  const [card, setCard] = useState<KanjiWithSrs | null>(null);
  const [type, setType] = useState<CardState>(CardState.NEW);
  const [dueDays, setDueDays] = useState('0');
  const [intervalDays, setIntervalDays] = useState('0');
  const [factor, setFactor] = useState('2500');
  const [lapses, setLapses] = useState('0');
  const [status, setStatus] = useState('');
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Briefly flip the Save button to "Saved ✓" so the tap gets visible feedback at the button,
  // not just in the status line at the top of the scroll view.
  const flashSaved = () => {
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1500);
  };
  useEffect(() => () => {
    if (savedTimer.current) clearTimeout(savedTimer.current);
  }, []);

  // Every studied kanji (one row per Srs entry), most overdue first.
  const refresh = async () => {
    const studied = (await getAllKanjiWithSrs()).filter((k) => k.rawSrs != null);
    studied.sort((a, b) => srsOf(a).due - srsOf(b).due);
    setRows(studied);
  };
  useEffect(() => {
    refresh();
  }, []);

  const select = (found: KanjiWithSrs) => {
    const srs = srsOf(found);
    const now = Math.floor(Date.now() / 1000);
    setCard(found);
    setType(srs.type);
    setDueDays(String(Math.round((srs.due - now) / DAY)));
    setIntervalDays(String(+(srs.interval / DAY).toFixed(3)));
    setFactor(String(srs.factor));
    setLapses(String(srs.lapses));
    setStatus(`Editing ${found.kanji.character}.`);
  };

  const save = async () => {
    if (!card) return;
    const now = Math.floor(Date.now() / 1000);
    const srs: Srs = {
      character: card.kanji.character,
      type,
      due: now + Math.round(toNum(dueDays) * DAY),
      interval: Math.round(toNum(intervalDays) * DAY),
      factor: Math.round(toNum(factor)),
      lapses: Math.round(toNum(lapses)),
    };
    await upsertSrs(srs);
    setCard({ ...card, rawSrs: srs });
    setStatus(`Saved ${card.kanji.character}: ${STATES[type].label}, due in ${toNum(dueDays)}d.`);
    flashSaved();
    await refresh();
  };

  const reset = async () => {
    if (!card) return;
    const ch = card.kanji.character;
    await deleteSrs(ch);
    setCard(null);
    setStatus(`Deleted SRS row — ${ch} is now unstudied (New).`);
    await refresh();
  };

  const now = Math.floor(Date.now() / 1000);

  return (
    <ScrollView style={{ backgroundColor: p.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.warning, { color: p.textSecondary }]}>
        Dev-only admin panel — not included in production builds.
      </Text>

      {status !== '' && <Text style={[styles.status, { color: p.textSecondary }]}>{status}</Text>}

      <Text style={[styles.listHeader, { color: p.textSecondary }]}>
        {rows.length} studied kanji — tap to edit
      </Text>

      {rows.length === 0 ? (
        <Text style={[styles.status, { color: p.textSecondary }]}>No SRS rows yet.</Text>
      ) : (
        <View style={[styles.list, { borderColor: p.border }]}>
          {rows.map((k) => {
            const srs = srsOf(k);
            const selected = card?.kanji.character === k.kanji.character;
            return (
              <Pressable
                key={k.kanji.character}
                onPress={() => select(k)}
                style={[styles.row, { borderColor: p.border }, selected && { backgroundColor: p.surfaceVariant }]}
              >
                <Text style={[styles.rowGlyph, { color: p.text }]}>{k.kanji.character}</Text>
                <View style={[styles.stateDot, { backgroundColor: cardStateColors[srs.type] }]} />
                <Text style={[styles.rowState, { color: p.text }]}>{STATES[srs.type].label}</Text>
                <Text style={[styles.rowDue, { color: p.textSecondary }]}>{dueLabel(srs.due, now)}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {card && (
        <View style={[styles.editor, { backgroundColor: p.surfaceVariant }]}>
          <Text style={[styles.glyph, { color: p.text }]}>{card.kanji.character}</Text>

          <Text style={[styles.fieldLabel, { color: p.textSecondary }]}>State</Text>
          <View style={styles.stateRow}>
            {STATES.map(({ state, label }) => (
              <Pressable
                key={state}
                onPress={() => setType(state)}
                style={[
                  styles.stateChip,
                  { borderColor: cardStateColors[state] },
                  type === state && { backgroundColor: cardStateColors[state] },
                ]}
              >
                <Text style={[styles.stateChipText, { color: type === state ? '#000' : p.text }]}>{label}</Text>
              </Pressable>
            ))}
          </View>

          <Field label="Due (days from now, negative = overdue)" value={dueDays} onChange={setDueDays} p={p} />
          <Field label="Interval (days)" value={intervalDays} onChange={setIntervalDays} p={p} />
          <Field label="Ease factor (×1000, e.g. 2500)" value={factor} onChange={setFactor} p={p} />
          <Field label="Lapses" value={lapses} onChange={setLapses} p={p} />

          <View style={styles.actions}>
            <Pressable
              onPress={save}
              style={[styles.actionBtn, { backgroundColor: saved ? cardStateColors[CardState.REVIEW] : p.primary }]}
            >
              <Text style={[styles.actionBtnText, { color: saved ? '#000' : p.onPrimary }]}>
                {saved ? 'Saved ✓' : 'Save'}
              </Text>
            </Pressable>
            <Pressable onPress={reset} style={[styles.actionBtn, { backgroundColor: cardStateColors[CardState.RELEARNING] }]}>
              <Text style={[styles.actionBtnText, { color: '#000' }]}>Delete (reset to New)</Text>
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChange,
  p,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  p: ReturnType<typeof usePalette>;
}) {
  return (
    <>
      <Text style={[styles.fieldLabel, { color: p.textSecondary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="numbers-and-punctuation"
        style={[styles.input, { color: p.text, borderColor: p.border, backgroundColor: p.card }]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 8 },
  warning: { fontSize: 13, fontStyle: 'italic' },
  status: { fontSize: 14 },
  listHeader: { fontSize: 13, marginTop: 4 },
  list: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  rowGlyph: { fontSize: 26, width: 36, textAlign: 'center' },
  stateDot: { width: 10, height: 10, borderRadius: 5 },
  rowState: { fontSize: 15, flex: 1 },
  rowDue: { fontSize: 13 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16 },
  editor: { borderRadius: 12, padding: 16, gap: 6, marginTop: 8 },
  glyph: { fontSize: 56, textAlign: 'center' },
  fieldLabel: { fontSize: 13, marginTop: 8 },
  stateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stateChip: { borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8 },
  stateChipText: { fontSize: 14, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionBtn: { flex: 1, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  actionBtnText: { fontSize: 16, fontWeight: '600' },
});
