// Grid/list layout toggle for the kanji browse and search screens, plus the hook that loads
// and persists the choice. Each screen passes its own EnumPref so the two screens remember
// their layout independently.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { EnumPref, KanjiView } from '@/settings/preferences';
import { getString, setString } from '@/settings/settingsProvider';
import { radius, spacing, usePalette } from '@/ui/theme';

/** Reads the persisted layout for `pref` once on mount; the setter writes through to storage. */
export function useKanjiView(pref: EnumPref<KanjiView>) {
  const [mode, setMode] = useState<KanjiView>(pref.default);

  useEffect(() => {
    let active = true;
    getString(pref).then((v) => {
      if (active) setMode(v);
    });
    return () => {
      active = false;
    };
  }, [pref]);

  const update = useCallback(
    (next: KanjiView) => {
      setMode(next);
      setString(pref, next);
    },
    [pref],
  );

  return [mode, update] as const;
}

export function ViewModeToggle({ mode, onChange }: { mode: KanjiView; onChange: (m: KanjiView) => void }) {
  const p = usePalette();
  return (
    <View style={[styles.group, { borderColor: p.border }]}>
      {(['grid', 'list'] as const).map((m) => {
        const active = mode === m;
        return (
          <Pressable
            key={m}
            onPress={() => onChange(m)}
            style={[styles.seg, active && { backgroundColor: p.primary }]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={m === 'grid' ? 'Grid layout' : 'List layout'}
          >
            <Ionicons
              name={m === 'grid' ? 'grid-outline' : 'list-outline'}
              size={18}
              color={active ? p.onPrimary : p.textSecondary}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: 'row', borderWidth: 1, borderRadius: radius.sm, overflow: 'hidden' },
  seg: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, alignItems: 'center', justifyContent: 'center' },
});
