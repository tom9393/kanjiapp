// Shared study UI primitives, ported from the study/view/* composables.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Line, Path, Polyline } from 'react-native-svg';
import { getStrokes } from '@/data/repository';
import { ExampleSentence, Kanji } from '@/data/types';
import { CardEase } from '@/domain/cardState';
import { Point } from '@/domain/models';
import { usePalette } from '@/ui/theme';

export function Btn({
  label,
  onPress,
  variant = 'filled',
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'filled' | 'outlined';
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const p = usePalette();
  const outlined = variant === 'outlined';
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.btn,
        outlined
          ? { borderWidth: 1, borderColor: p.border, backgroundColor: 'transparent' }
          : { backgroundColor: p.primary },
        disabled && { opacity: 0.4 },
        pressed && !disabled && { opacity: 0.7 },
        style,
      ]}
    >
      <Text style={[styles.btnLabel, { color: outlined ? p.text : p.onPrimary }]}>{label}</Text>
    </Pressable>
  );
}

export function MetaChips({ grade, strokes }: { grade: number; strokes: number }) {
  const p = usePalette();
  return (
    <View style={styles.row}>
      <Text style={[styles.chip, { color: p.textSecondary }]}>Grade {grade}</Text>
      <Text style={[styles.chip, { color: p.textSecondary }]}>{strokes} strokes</Text>
    </View>
  );
}

function LabeledField({ label, value }: { label: string; value: string }) {
  const p = usePalette();
  if (!value || value.trim().length === 0) return null;
  return (
    <View style={styles.fieldRow}>
      <Text style={[styles.fieldLabel, { color: p.text }]}>{label}: </Text>
      <Text style={[styles.fieldValue, { color: p.text }]}>{value}</Text>
    </View>
  );
}

export function Readings({ kanji, style }: { kanji: Kanji; style?: ViewStyle }) {
  return (
    <View style={style}>
      <LabeledField label="Meanings" value={kanji.meanings} />
      <LabeledField label="On" value={kanji.on} />
      <LabeledField label="Kun" value={kanji.kun} />
    </View>
  );
}

export function SentenceCard({ sentence, style }: { sentence: ExampleSentence; style?: ViewStyle }) {
  const p = usePalette();
  return (
    <View style={[styles.sentenceCard, { backgroundColor: p.surfaceVariant }, style]}>
      <Text style={[styles.sentenceJp, { color: p.text }]}>{sentence.japanese}</Text>
      <Text style={[styles.sentenceEn, { color: p.textSecondary }]}>{sentence.english}</Text>
    </View>
  );
}

// KanjiVG stroke colors + canvas, ported from StrokeOrderDiagram.kt's buildStepSvg(): a
// white 109×109 board with prior strokes greyed and the current stroke highlighted red.
const STROKE_PRIOR = '#BDBDBD';
const STROKE_CURRENT = '#D32F2F';
const KVG_VIEWBOX = 109;

/**
 * KanjiVG stroke-order diagram. Loads the character's stroke paths from the prebuilt
 * strokes.db and reveals them one step at a time — strokes up to the current step are drawn,
 * with the latest in red. Tap the left/right edge to step back/forward. Mirrors
 * StrokeOrderDiagram.kt. Renders nothing for characters without a diagram.
 */
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

const EASES: { ease: CardEase; label: string }[] = [
  { ease: CardEase.Again, label: 'Again' },
  { ease: CardEase.Hard, label: 'Hard' },
  { ease: CardEase.Good, label: 'Good' },
  { ease: CardEase.Easy, label: 'Easy' },
];

export function AnswerButtons({ onAnswer }: { onAnswer: (ease: CardEase) => void }) {
  return (
    <View style={styles.answerRow}>
      {EASES.map(({ ease, label }) => (
        <Btn key={label} label={label} onPress={() => onAnswer(ease)} style={styles.flex1} />
      ))}
    </View>
  );
}

/**
 * Drawing surface — captures strokes with a pan gesture and renders them with SVG. The
 * in-progress and completed strokes are component-local: they're ephemeral view state the
 * rest of the app never reads, so they don't belong in the session store. Mount with a
 * `key` tied to the card/round to reset between prompts (see StudyContent).
 */
export function DrawingArea({ strokeWidth }: { strokeWidth: number }) {
  const p = usePalette();
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

  const toPoints = (s: Point[]) => s.map((pt) => `${pt.x},${pt.y}`).join(' ');
  const cx = size.w / 2;
  const cy = size.h / 2;
  const gap = Math.min(size.w, size.h) * 0.08;
  const grid = p.textSecondary;

  return (
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
  );
}

/** The revealed answer (big glyph + readings + optional sentence) shown over the prompt. */
export function RevealOverlay({
  kanji,
  sentence,
  onAnswer,
}: {
  kanji: Kanji;
  sentence: ExampleSentence | null;
  onAnswer: (ease: CardEase) => void;
}) {
  const p = usePalette();
  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => {}}>
      <View style={styles.backdrop}>
        <View style={[styles.revealCard, { backgroundColor: p.background }]}>
          <ScrollView contentContainerStyle={styles.revealScroll}>
            <Text style={[styles.bigGlyph, { color: p.text }]}>{kanji.character}</Text>
            <MetaChips grade={kanji.grade} strokes={kanji.strokes} />
            <Readings kanji={kanji} style={styles.gap8} />
            {sentence && <SentenceCard sentence={sentence} style={styles.gap8} />}
          </ScrollView>
          <AnswerButtons onAnswer={onAnswer} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  flex1: { flex: 1 },
  // Vertical spacing folded onto real elements, replacing standalone spacer Views.
  gap8: { marginTop: 8 },
  gap12: { marginTop: 12 },
  btn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', marginHorizontal: 4 },
  btnLabel: { fontSize: 15, fontWeight: '600' },
  chip: { fontSize: 12, marginRight: 12 },
  fieldRow: { flexDirection: 'row', paddingVertical: 2, flexWrap: 'wrap' },
  fieldLabel: { fontSize: 15, fontWeight: '600' },
  fieldValue: { fontSize: 15, flexShrink: 1 },
  sentenceCard: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  sentenceJp: { fontSize: 16, marginBottom: 4 },
  sentenceEn: { fontSize: 13 },
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
  answerRow: { flexDirection: 'row', paddingHorizontal: 4, paddingVertical: 6 },
  canvas: { flex: 1, margin: 8, borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 },
  revealCard: { borderRadius: 16, padding: 16, maxHeight: '85%' },
  revealScroll: { alignItems: 'center', paddingBottom: 12 },
  bigGlyph: { fontSize: 96, fontWeight: '700' },
});
