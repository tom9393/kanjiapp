// Ported from settingsmenu/view/SettingsScreen.kt — sectioned preference list. Each section
// is a card of divided rows; booleans render a Switch, numbers an inline numeric field.
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BoolPref, NumberPref, Prefs } from '@/settings/preferences';
import { useSettingsStore } from '@/state/settingsStore';
import { usePalette } from '@/ui/theme';

type AnyPref = NumberPref | BoolPref;

interface Section {
  title: string;
  prefs: AnyPref[];
}

const SECTIONS: Section[] = [
  { title: 'Appearance', prefs: [Prefs.darkMode, Prefs.strokeWidth] },
  {
    title: 'Study',
    prefs: [Prefs.maxReviewsPerDay, Prefs.newCardsPerDay, Prefs.dailyResetHour, Prefs.learningRepetitions],
  },
  { title: 'Question Types', prefs: [Prefs.studyModeHandwriting, Prefs.studyModeReading] },
  { title: 'SRS Timing', prefs: [Prefs.againDelay, Prefs.hardDelay, Prefs.goodDelay, Prefs.easyDelay] },
  { title: 'Examples', prefs: [Prefs.showExampleWords, Prefs.showExampleSentences] },
];

const ALL_PREFS: AnyPref[] = SECTIONS.flatMap((s) => s.prefs);

export default function SettingsScreen() {
  const p = usePalette();
  const values = useSettingsStore((s) => s.values);
  const loaded = useSettingsStore((s) => s.loaded);

  useEffect(() => {
    useSettingsStore.getState().load(ALL_PREFS);
  }, []);

  if (!loaded) {
    return (
      <View style={[styles.center, { backgroundColor: p.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: p.background }}
      contentContainerStyle={styles.content}
    >
      {SECTIONS.map((section) => (
        <SectionCard key={section.title} section={section} values={values} />
      ))}
    </ScrollView>
  );
}

function SectionCard({
  section,
  values,
}: {
  section: Section;
  values: Record<string, number | boolean>;
}) {
  const p = usePalette();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: p.primary }]}>{section.title.toUpperCase()}</Text>
      <View style={[styles.card, { backgroundColor: p.surfaceVariant }]}>
        {section.prefs.map((pref, index) => (
          <View key={pref.key}>
            {index > 0 && <View style={[styles.divider, { backgroundColor: p.border }]} />}
            <SettingRow pref={pref} value={values[pref.key]} />
          </View>
        ))}
      </View>
    </View>
  );
}

function SettingRow({ pref, value }: { pref: AnyPref; value: number | boolean }) {
  const p = usePalette();
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={[styles.label, { color: p.text }]}>{pref.label}</Text>
        {pref.description ? (
          <Text style={[styles.description, { color: p.textSecondary }]}>{pref.description}</Text>
        ) : null}
      </View>
      {typeof pref.default === 'boolean' ? (
        <BoolControl pref={pref as BoolPref} value={value as boolean} />
      ) : (
        <NumberControl pref={pref as NumberPref} value={value as number} />
      )}
    </View>
  );
}

function BoolControl({ pref, value }: { pref: BoolPref; value: boolean }) {
  const p = usePalette();
  const updateBoolean = useSettingsStore((s) => s.updateBoolean);
  return (
    <Switch
      value={value}
      onValueChange={(v) => updateBoolean(pref, v)}
      trackColor={{ true: p.primary, false: p.border }}
    />
  );
}

function NumberControl({ pref, value }: { pref: NumberPref; value: number }) {
  const p = usePalette();
  const updateNumber = useSettingsStore((s) => s.updateNumber);
  const [text, setText] = useState(String(value));

  return (
    <TextInput
      value={text}
      onChangeText={(t) => {
        setText(t);
        // Only commit valid integers; an empty/partial field keeps the last stored value (matches native toLongOrNull()).
        if (t.trim() !== '' && Number.isInteger(Number(t))) {
          updateNumber(pref, Number(t));
        }
      }}
      keyboardType="numeric"
      style={[styles.input, { color: p.text, borderColor: p.border }]}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 16, paddingVertical: 24, gap: 20 },
  section: { gap: 6 },
  sectionTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, paddingHorizontal: 4 },
  card: { borderRadius: 12, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 16 },
  rowText: { flex: 1, gap: 2 },
  label: { fontSize: 16 },
  description: { fontSize: 13 },
  input: {
    minWidth: 72,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlign: 'center',
    fontSize: 15,
  },
});
