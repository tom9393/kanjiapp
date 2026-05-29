// A single settings group, reached from the settings menu. Booleans render a Switch,
// numbers an inline numeric field — same row rendering the combined screen used before.
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { BoolPref, EnumPref, NumberPref } from '@/settings/preferences';
import { ALL_PREFS, AnyPref, SECTIONS } from '@/settings/sections';
import { useSettingsStore } from '@/state/settingsStore';
import { usePalette } from '@/ui/theme';

export default function SettingsSection() {
  const p = usePalette();
  const { section: sectionId } = useLocalSearchParams<{ section: string }>();
  const section = SECTIONS.find((s) => s.id === sectionId);
  const values = useSettingsStore((s) => s.values);
  const loaded = useSettingsStore((s) => s.loaded);

  useEffect(() => {
    useSettingsStore.getState().load(ALL_PREFS);
  }, []);

  if (!section) return null;

  return (
    <>
      <Stack.Screen options={{ title: section.title }} />
      {!loaded ? (
        <View style={[styles.center, { backgroundColor: p.background }]}>
          <ActivityIndicator />
        </View>
      ) : (
        <ScrollView style={{ backgroundColor: p.background }} contentContainerStyle={styles.content}>
          <View style={[styles.card, { backgroundColor: p.surfaceVariant }]}>
            {section.prefs.map((pref, index) => (
              <View key={pref.key}>
                {index > 0 && <View style={[styles.divider, { backgroundColor: p.border }]} />}
                <SettingRow pref={pref} value={values[pref.key]} />
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </>
  );
}

function SettingRow({ pref, value }: { pref: AnyPref; value: number | boolean | string }) {
  const p = usePalette();
  const isEnum = 'options' in pref;
  return (
    <View style={[styles.row, isEnum && styles.rowColumn]}>
      <View style={styles.rowText}>
        <Text style={[styles.label, { color: p.text }]}>{pref.label}</Text>
        {pref.description ? (
          <Text style={[styles.description, { color: p.textSecondary }]}>{pref.description}</Text>
        ) : null}
      </View>
      {isEnum ? (
        <EnumControl pref={pref} value={value as string} />
      ) : typeof pref.default === 'boolean' ? (
        <BoolControl pref={pref as BoolPref} value={value as boolean} />
      ) : (
        <NumberControl pref={pref as NumberPref} value={value as number} />
      )}
    </View>
  );
}

function EnumControl({ pref, value }: { pref: EnumPref; value: string }) {
  const p = usePalette();
  const updateEnum = useSettingsStore((s) => s.updateEnum);
  return (
    <View style={styles.pillRow}>
      {pref.options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => updateEnum(pref, opt.value)}
            style={[
              styles.pill,
              { borderColor: selected ? p.primary : p.border, backgroundColor: selected ? p.primary : 'transparent' },
            ]}
          >
            <Text style={[styles.pillText, { color: selected ? p.background : p.text }]}>{opt.label}</Text>
          </Pressable>
        );
      })}
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
  content: { paddingHorizontal: 16, paddingVertical: 24 },
  card: { borderRadius: 12, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 16 },
  rowColumn: { flexDirection: 'column', alignItems: 'stretch', gap: 12 },
  rowText: { flex: 1, gap: 2 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8 },
  pillText: { fontSize: 14 },
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
