// KanjiVG stroke-order diagram. Loads the character's stroke paths from the prebuilt
// strokes.db and reveals them one step at a time — strokes up to the current step are drawn,
// with the latest in red. Tap the left/right edge to step back/forward. Mirrors
// StrokeOrderDiagram.kt. Renders nothing for characters without a diagram.
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { getStrokes } from '@/data/repository/strokes';
import { usePalette } from '@/ui/theme';

// KanjiVG stroke colors + canvas, ported from StrokeOrderDiagram.kt's buildStepSvg(): a
// white 109×109 board with prior strokes greyed and the current stroke highlighted red.
const STROKE_PRIOR = '#BDBDBD';
const STROKE_CURRENT = '#D32F2F';
const KVG_VIEWBOX = 109;

export function StrokeOrderDiagram({ character }: { character: string }) {
  const p = usePalette();
  const [paths, setPaths] = useState<string[]>([]);
  const [step, setStep] = useState(1);

  useEffect(() => {
    let active = true;
    setStep(1);
    setPaths([]);
    getStrokes(character).then((s) => {
      if (active) setPaths(s);
    });
    return () => {
      active = false;
    };
  }, [character]);

  if (paths.length === 0) return null;

  return (
    <View style={[styles.strokeBoard, { borderColor: p.border }]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${KVG_VIEWBOX} ${KVG_VIEWBOX}`} pointerEvents="none">
        {paths.slice(0, step).map((d, i) => (
          <Path
            key={i}
            d={d}
            fill="none"
            stroke={i === step - 1 ? STROKE_CURRENT : STROKE_PRIOR}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </Svg>
      <Text style={styles.strokeCounter}>
        {step} / {paths.length}
      </Text>
      {step > 1 && (
        <Pressable style={[styles.strokeNav, styles.strokeNavLeft]} onPress={() => setStep((s) => s - 1)}>
          <Text style={styles.strokeArrow}>←</Text>
        </Pressable>
      )}
      {step < paths.length && (
        <Pressable style={[styles.strokeNav, styles.strokeNavRight]} onPress={() => setStep((s) => s + 1)}>
          <Text style={styles.strokeArrow}>→</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  strokeBoard: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  strokeCounter: { position: 'absolute', top: 6, alignSelf: 'center', fontSize: 13, color: '#555555' },
  strokeNav: {
    position: 'absolute',
    top: '30%',
    height: '40%',
    width: '20%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  strokeNavLeft: { left: 0 },
  strokeNavRight: { right: 0 },
  strokeArrow: {
    color: '#FFFFFF',
    fontSize: 16,
    width: 30,
    height: 30,
    lineHeight: 30,
    borderRadius: 15,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    overflow: 'hidden',
  },
});
