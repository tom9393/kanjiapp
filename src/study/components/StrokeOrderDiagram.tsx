// KanjiVG stroke-order diagram. Loads the character's stroke paths from the prebuilt
// strokes.db and shows them one of two ways, per the "Animate strokes" setting:
//   - stepped (default): strokes up to the current step are drawn, latest in red; tap the
//     left/right edge to step back/forward. Mirrors StrokeOrderDiagram.kt.
//   - animated: the strokes draw themselves in order, each from start to end, as if written
//     on screen; tap to replay.
// Renders nothing for characters without a diagram.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { getStrokes } from '@/data/repository/strokes';
import { Prefs } from '@/settings/preferences';
import { getAnimateStrokes } from '@/settings/settingsProvider';
import { useSetting } from '@/settings/useSetting';
import { usePalette } from '@/ui/theme';

// KanjiVG stroke colors + canvas, ported from StrokeOrderDiagram.kt's buildStepSvg(): a
// white 109×109 board with prior strokes greyed and the current stroke highlighted red.
const STROKE_PRIOR = '#BDBDBD';
const STROKE_CURRENT = '#D32F2F';
const STROKE_INK = '#333333'; // colour of the animated "ink" as each stroke is drawn
const STROKE_WIDTH = 3;
const KVG_VIEWBOX = 109;
const MS_PER_LENGTH = 7; // pen speed: ms spent drawing one KanjiVG length unit (constant across strokes)

const AnimatedPath = Animated.createAnimatedComponent(Path);

export function StrokeOrderDiagram({ character }: { character: string }) {
  const p = usePalette();
  const animate = useSetting(getAnimateStrokes) ?? Prefs.animateStrokes.default;
  const [paths, setPaths] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
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
      {animate ? <AnimatedStrokes paths={paths} /> : <SteppedStrokes paths={paths} />}
    </View>
  );
}

// Tap-to-step diagram: the original behaviour, shown when animation is off.
function SteppedStrokes({ paths }: { paths: string[] }) {
  const [step, setStep] = useState(1);
  useEffect(() => setStep(1), [paths]);

  return (
    <>
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
    </>
  );
}

// Self-drawing diagram: one shared progress value (0 → total length) sweeps the "pen" across
// the strokes in order. Each stroke is revealed with the SVG dash trick — a single dash as
// long as the stroke, whose offset shrinks from the full length (hidden) to 0 (fully drawn).
// While hidden the offset is padded by a stroke width so the dash's round end-cap parks just
// off the path start instead of landing on it as a stray dot; the gap is widened to match so
// the following dash never wraps back onto the stroke's end.
function AnimatedStrokes({ paths }: { paths: string[] }) {
  const progress = useRef(new Animated.Value(0)).current;

  // Per-stroke arc length plus the cumulative length before each stroke, so the same
  // progress value drives every stroke at one steady pen speed. Length floored at 1 to keep
  // each interpolation's input range strictly increasing.
  const { offsets, lengths, total } = useMemo(() => {
    const lengths = paths.map((d) => Math.max(pathLength(d), 1));
    const offsets: number[] = [];
    let acc = 0;
    for (const len of lengths) {
      offsets.push(acc);
      acc += len;
    }
    return { offsets, lengths, total: acc };
  }, [paths]);

  const play = useCallback(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: total,
      duration: Math.max(total * MS_PER_LENGTH, 500),
      easing: Easing.linear,
      useNativeDriver: false, // SVG props can't run on the native driver
    }).start();
  }, [progress, total]);

  useEffect(() => play(), [play]);

  return (
    <Pressable style={styles.fill} onPress={play}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${KVG_VIEWBOX} ${KVG_VIEWBOX}`} pointerEvents="none">
        {paths.map((d, i) => (
          <AnimatedPath
            key={i}
            d={d}
            fill="none"
            stroke={STROKE_INK}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={[lengths[i], lengths[i] + STROKE_WIDTH * 2]}
            strokeDashoffset={progress.interpolate({
              inputRange: [offsets[i], offsets[i] + lengths[i]],
              outputRange: [lengths[i] + STROKE_WIDTH, 0],
              extrapolate: 'clamp',
            })}
          />
        ))}
      </Svg>
      <Text style={styles.replayHint}>↻</Text>
    </Pressable>
  );
}

// Total arc length of a KanjiVG stroke path, in viewBox units. KanjiVG paths use only M/m
// (move), C/c (cubic) and S/s (smooth cubic) — see scripts/build-stroke-db.mjs — so we
// flatten each cubic by sampling and sum the chord lengths.
function pathLength(d: string): number {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  let i = 0;
  const num = () => parseFloat(tokens[i++]);
  let cx = 0;
  let cy = 0; // current point
  let px = 0;
  let py = 0; // previous cubic's second control point, for S/s reflection
  let prev = '';
  let total = 0;

  while (i < tokens.length) {
    let cmd = tokens[i];
    if (/[a-zA-Z]/.test(cmd)) i++;
    else cmd = prev; // a bare number repeats the previous command
    const rel = cmd === cmd.toLowerCase();
    switch (cmd.toUpperCase()) {
      case 'M': {
        let x = num();
        let y = num();
        if (rel) {
          x += cx;
          y += cy;
        }
        cx = x;
        cy = y;
        prev = rel ? 'l' : 'L'; // extra pairs after a move are implicit lineto (unused here)
        break;
      }
      case 'C': {
        let c1x = num();
        let c1y = num();
        let c2x = num();
        let c2y = num();
        let x = num();
        let y = num();
        if (rel) {
          c1x += cx;
          c1y += cy;
          c2x += cx;
          c2y += cy;
          x += cx;
          y += cy;
        }
        total += cubicLength(cx, cy, c1x, c1y, c2x, c2y, x, y);
        px = c2x;
        py = c2y;
        cx = x;
        cy = y;
        prev = rel ? 'c' : 'C';
        break;
      }
      case 'S': {
        let c2x = num();
        let c2y = num();
        let x = num();
        let y = num();
        if (rel) {
          c2x += cx;
          c2y += cy;
          x += cx;
          y += cy;
        }
        // First control point reflects the previous cubic's, else sits on the current point.
        const smooth = prev.toUpperCase() === 'C' || prev.toUpperCase() === 'S';
        const c1x = smooth ? 2 * cx - px : cx;
        const c1y = smooth ? 2 * cy - py : cy;
        total += cubicLength(cx, cy, c1x, c1y, c2x, c2y, x, y);
        px = c2x;
        py = c2y;
        cx = x;
        cy = y;
        prev = rel ? 's' : 'S';
        break;
      }
      default:
        i++; // skip anything unexpected
    }
  }
  return total;
}

function cubicLength(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
): number {
  const SAMPLES = 16;
  let len = 0;
  let lastX = x0;
  let lastY = y0;
  for (let s = 1; s <= SAMPLES; s++) {
    const t = s / SAMPLES;
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const c = 3 * u * t * t;
    const e = t * t * t;
    const x = a * x0 + b * x1 + c * x2 + e * x3;
    const y = a * y0 + b * y1 + c * y2 + e * y3;
    len += Math.hypot(x - lastX, y - lastY);
    lastX = x;
    lastY = y;
  }
  return len;
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
  fill: { ...StyleSheet.absoluteFillObject },
  strokeCounter: { position: 'absolute', top: 6, alignSelf: 'center', fontSize: 13, color: '#555555' },
  replayHint: { position: 'absolute', bottom: 6, right: 8, fontSize: 16, color: '#9E9E9E' },
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
