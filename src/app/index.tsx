// Ported from frontpage/view/FrontpageScreen.kt. Home: due/new counts + begin-studying entry.
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { canStudy, useFrontpageStore } from '@/state/frontpageStore';
import { Btn } from '@/study/components/Btn';
import { usePalette } from '@/ui/theme';

export default function Frontpage() {
  const router = useRouter();
  const p = usePalette();
  const dueCount = useFrontpageStore((s) => s.dueCount);
  const newCount = useFrontpageStore((s) => s.newCount);
  const extraAvailable = useFrontpageStore((s) => s.extraAvailable);
  const loading = useFrontpageStore((s) => s.loading);
  const load = useFrontpageStore((s) => s.load);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: p.background }]} edges={['bottom']}>
      <View style={styles.center}>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <>
            <Text style={[styles.count, { color: p.text }]}>{dueCount} cards due for review</Text>
            <Text style={[styles.count, { color: p.text }]}>{newCount} new cards to study</Text>
            <View style={{ height: 12 }} />

            {canStudy({ dueCount, newCount }) ? (
              <Btn label="Begin studying" onPress={() => router.push('/study')} />
            ) : extraAvailable ? (
              <>
                <Text style={[styles.note, { color: p.textSecondary }]}>
                  Daily limit reached. Study 10 more cards?
                </Text>
                <View style={{ height: 8 }} />
                <Btn label="Study 10 more" onPress={() => router.push({ pathname: '/study', params: { extra: '10' } })} />
              </>
            ) : null}
          </>
        )}
      </View>

      <View style={styles.footer}>
        <Btn label="Browse Kanji" variant="outlined" onPress={() => router.push('/kanji')} style={styles.footerBtn} />
        <Btn label="Stats" variant="outlined" onPress={() => router.push('/stats')} style={styles.footerBtn} />
        <Btn label="Settings" variant="outlined" onPress={() => router.push('/settings')} style={styles.footerBtn} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, padding: 16 },
  count: { fontSize: 17, textAlign: 'center' },
  note: { fontSize: 14, textAlign: 'center' },
  footer: { flexDirection: 'row', padding: 16 },
  footerBtn: { flex: 1 },
});
