// Circular progress indicator built on react-native-svg: a faint full track with a colored arc
// drawn on top via stroke-dasharray. Center content (a number, a label) is layered over the SVG
// with absolute fill. Used by the home dashboard's "today's progress" hero.
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

export function ProgressRing({
  progress,
  size = 88,
  strokeWidth = 8,
  color,
  trackColor,
  children,
}: {
  /** 0..1; clamped. */
  progress: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  trackColor: string;
  children?: React.ReactNode;
}) {
  const clamped = Math.max(0, Math.min(1, progress));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const half = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={half} cy={half} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={half}
          cy={half}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          // Start the arc at 12 o'clock instead of 3 o'clock.
          transform={`rotate(-90 ${half} ${half})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
