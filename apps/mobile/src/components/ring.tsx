import Svg, { Circle } from 'react-native-svg';

/** Single progress ring (0–1), drawn clockwise from 12 o'clock. */
export function Ring({ size, value, color, label }: { size: number; value: number; color: string; label: string }) {
  const r = 44;
  const C = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: [{ rotate: '-90deg' }] }} accessibilityLabel={label}>
      <Circle r={r} cx={50} cy={50} fill="none" stroke="rgba(23,20,15,0.08)" strokeWidth={7} />
      <Circle r={r} cx={50} cy={50} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - Math.min(Math.max(value, 0), 1))} />
    </Svg>
  );
}
