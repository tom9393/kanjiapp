// Ported from study/view/StudyScreen.kt. Loads a session from the route params, dispatches
// to StudyContent by phase, and navigates when the store reaches the complete status.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadRequest, useStudyStore } from '@/state/studyStore';
import { StudyContent } from '@/study/StudyContent';
import { usePalette } from '@/ui/theme';

export default function StudyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ year?: string; extra?: string }>();
  const p = usePalette();

  const status = useStudyStore((s) => s.studyStatus());

  useEffect(() => {
    const year = Number(params.year ?? 0);
    const extra = Number(params.extra ?? 0);
    const req: LoadRequest = year > 0 ? { kind: 'year', year } : extra > 0 ? { kind: 'extra', n: extra } : { kind: 'dueAndNew' };
    // Read the action off the store rather than subscribing, so this runs once on mount.
    useStudyStore.getState().start(req);
  }, [params.year, params.extra]);

  useEffect(() => {
    if (status === 'complete') router.replace('/complete');
  }, [status, router]);

  if (status !== 'active') {
    return (
      <View style={[styles.center, { backgroundColor: p.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: p.background }]} edges={['bottom']}>
      <StudyContent />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
