// Home dashboard: streak + today's progress + due counts and the begin-studying entry.
// Ported from frontpage/view/FrontpageScreen.kt, expanded into a dashboard.
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { canStudy, useFrontpageStore } from '@/state/frontpageStore';
import { LoadRequest } from '@/state/studyStore';
import { Divider, StatBox, StatCard, shared } from '@/stats/primitives';
import { Btn } from '@/study/components/Btn';
import { usePalette } from '@/ui/theme';

export default function Frontpage() {
  const router = useRouter();
  const p = usePalette();
  const dueCount = useFrontpageStore((s) => s.dueCount);
  const newCount = useFrontpageStore((s) => s.newCount);
  const extraAvailable = useFrontpageStore((s) => s.extraAvailable);
  const streak = useFrontpageStore((s) => s.streak);
  const todayReviews = useFrontpageStore((s) => s.todayReviews);
  const todayNew = useFrontpageStore((s) => s.todayNew);
  const todayAgain = useFrontpageStore((s) => s.todayAgain);
  const totalReviews = useFrontpageStore((s) => s.totalReviews);
  const loading = useFrontpageStore((s) => s.loading);
  const load = useFrontpageStore((s) => s.load);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center, { backgroundColor: p.background }]} edges={['bottom']}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  const todayCorrect = todayReviews - todayAgain;
  const retentionPct = todayReviews > 0 ? Math.round((todayCorrect / todayReviews) * 100) : 0;

  const startStudy = (req: LoadRequest) => router.push({ pathname: '/study', params: { req: JSON.stringify(req) } });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: p.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.streakCard, { backgroundColor: p.surfaceVariant }]}>
          <Text style={[styles.streakLabel, { color: p.textSecondary }]}>
            {`${streak} day streak · ${totalReviews} reviews all-time`}
          </Text>
        </View>

        <StatCard title="Today">
          <View style={styles.statRow}>
            <StatBox label="Reviews" value={String(todayReviews)} />
            <StatBox label="New" value={String(todayNew)} />
            <StatBox label="Again" value={String(todayAgain)} />
          </View>
          {todayReviews > 0 && (
            <>
              <View style={{ height: 8 }} />
              <Divider />
              <View style={{ height: 8 }} />
              <View style={shared.spaceBetween}>
                <Text style={[shared.bodySmall, { color: p.text }]}>{`${todayCorrect}/${todayReviews} correct`}</Text>
                <Text style={[shared.bodySmall, { color: p.text, fontWeight: '700' }]}>{`${retentionPct}%`}</Text>
              </View>
            </>
          )}
        </StatCard>

        <StatCard title="Study">
          <Text style={[styles.count, { color: p.text }]}>{`${dueCount} cards due for review`}</Text>
          <Text style={[styles.count, { color: p.text }]}>{`${newCount} new cards to study`}</Text>
          <View style={{ height: 12 }} />
          {canStudy({ dueCount, newCount }) ? (
            <Btn label="Begin studying" onPress={() => startStudy({ kind: 'dueAndNew' })} />
          ) : extraAvailable ? (
            <>
              <Text style={[styles.note, { color: p.textSecondary }]}>Daily limit reached. Study 10 more cards?</Text>
              <View style={{ height: 8 }} />
              <Btn label="Study 10 more" onPress={() => startStudy({ kind: 'extra', n: 10 })} />
            </>
          ) : (
            <Text style={[styles.note, { color: p.textSecondary }]}>All caught up. Nothing to study right now.</Text>
          )}
        </StatCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingVertical: 10 },
  streakCard: { borderRadius: 12, marginHorizontal: 16, marginVertical: 6, padding: 20, alignItems: 'center' },
  streakValue: { fontSize: 44, fontWeight: '800' },
  streakLabel: { fontSize: 13, marginTop: 4 },
  statRow: { flexDirection: 'row', justifyContent: 'space-evenly' },
  count: { fontSize: 16, textAlign: 'center', paddingVertical: 2 },
  note: { fontSize: 14, textAlign: 'center' },
});
