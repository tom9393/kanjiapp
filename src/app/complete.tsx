// Ported from study/view/StudyComplete.kt.
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Btn } from '@/study/components/Btn';
import { usePalette } from '@/ui/theme';

export default function StudyComplete() {
  const router = useRouter();
  const p = usePalette();

  return (
    <View style={[styles.container, { backgroundColor: p.background }]}>
      <Text style={[styles.title, { color: p.text }]}>Congratulations!</Text>
      <Text style={[styles.body, { color: p.text }]}>You&apos;ve finished all your cards for today.</Text>
      <Btn label="Back to home" onPress={() => router.replace('/')} style={styles.action} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 16, textAlign: 'center', marginTop: 8 },
  action: { marginTop: 16 },
});
