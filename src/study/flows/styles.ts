// Layout fragments shared by the study flow screens (src/study/flows/*). Flow-specific
// styles stay local to each screen; these are the ones several reuse.
import { StyleSheet } from 'react-native';

export const flowStyles = StyleSheet.create({
  fill: { flex: 1 },
  flex1: { flex: 1 },
  alignStart: { alignSelf: 'stretch' },
  // Vertical spacing folded onto real elements, replacing standalone spacer Views.
  gap8: { marginTop: 8 },
  gap12: { marginTop: 12 },
  bigGlyph: { fontSize: 64, fontWeight: '700', textAlign: 'center' },
  bottomRow: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 6, gap: 8 },
});
