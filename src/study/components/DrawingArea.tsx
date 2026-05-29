// Drawing surface — captures strokes with a pan gesture and renders them with SVG, plus a
// toolbar showing the stroke count and buttons to undo the last stroke or clear all of them.
// The in-progress and completed strokes are component-local: they're ephemeral view state the
// rest of the app never reads, so they don't belong in the session store. Mount with a
// `key` tied to the card/round to reset between prompts (see StudyContent).
import { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Line, Polyline } from 'react-native-svg';
import { Prefs } from '@/settings/preferences';
import { getStrokeWidth } from '@/settings/settingsProvider';
import { useSetting } from '@/settings/useSetting';
import { Btn } from '@/study/components/Btn';
import { usePalette } from '@/ui/theme';

interface Point {
  x: number;
  y: number;
}

export function DrawingArea() {
  const p = usePalette();
  const strokeWidth = useSetting(getStrokeWidth) ?? Prefs.strokeWidth.default;
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [completedStrokes, setCompletedStrokes] = useState<Point[][]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  // The active stroke is mirrored in a ref so onFinalize can commit the final points
  // without depending on a stale render closure.
  const strokeRef = useRef<Point[]>([]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(0)
        .maxPointers(1)
        .onBegin((e) => {
          strokeRef.current = [{ x: e.x, y: e.y }];
          setCurrentStroke(strokeRef.current);
        })
        .onUpdate((e) => {
          strokeRef.current = [...strokeRef.current, { x: e.x, y: e.y }];
          setCurrentStroke(strokeRef.current);
        })
        .onFinalize(() => {
          if (strokeRef.current.length > 0) {
            const finished = strokeRef.current;
            setCompletedStrokes((prev) => [...prev, finished]);
          }
          strokeRef.current = [];
          setCurrentStroke([]);
        }),
    [],
  );

  const clearAll = () => {
    strokeRef.current = [];
    setCurrentStroke([]);
    setCompletedStrokes([]);
  };
  const undoStroke = () => setCompletedStrokes((prev) => prev.slice(0, -1));
  const strokeCount = completedStrokes.length;

  const toPoints = (s: Point[]) => s.map((pt) => `${pt.x},${pt.y}`).join(' ');
  const cx = size.w / 2;
  const cy = size.h / 2;
  const gap = Math.min(size.w, size.h) * 0.08;
  const grid = p.textSecondary;

  return (
    <View style={styles.container}>
      <GestureDetector gesture={pan}>
        <View
          style={[styles.canvas, { borderColor: p.border }]}
          onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        >
          {size.w > 0 && (
            <Svg width={size.w} height={size.h} pointerEvents="none">
              <Line x1={cx} y1={0} x2={cx} y2={cy - gap} stroke={grid} strokeWidth={1} opacity={0.3} />
              <Line x1={cx} y1={cy + gap} x2={cx} y2={size.h} stroke={grid} strokeWidth={1} opacity={0.3} />
              <Line x1={0} y1={cy} x2={cx - gap} y2={cy} stroke={grid} strokeWidth={1} opacity={0.3} />
              <Line x1={cx + gap} y1={cy} x2={size.w} y2={cy} stroke={grid} strokeWidth={1} opacity={0.3} />
              {completedStrokes.map((s, i) => (
                <Polyline
                  key={i}
                  points={toPoints(s)}
                  fill="none"
                  stroke={p.text}
                  strokeWidth={strokeWidth}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}
              {currentStroke.length > 0 && (
                <Polyline
                  points={toPoints(currentStroke)}
                  fill="none"
                  stroke={p.text}
                  strokeWidth={strokeWidth}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}
            </Svg>
          )}
        </View>
      </GestureDetector>

      <View style={styles.toolbar}>
        <Text style={[styles.count, { color: p.textSecondary }]}>
          {strokeCount} {strokeCount === 1 ? 'stroke' : 'strokes'}
        </Text>
        <Btn label="Undo stroke" variant="outlined" onPress={undoStroke} disabled={strokeCount === 0} />
        <Btn label="Clear" variant="outlined" onPress={clearAll} disabled={strokeCount === 0} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  canvas: { flex: 1, margin: 8, borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  toolbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 4 },
  count: { flex: 1, fontSize: 13, paddingLeft: 4 },
});
