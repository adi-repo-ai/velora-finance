import { useEffect, type ReactNode } from 'react';
import { useColorScheme, View } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

function wavePath(w: number, h: number, amp: number, phase: number) {
  let d = `M0 ${amp}`;
  for (let x = 0; x <= w * 2; x += 6) d += ` L${x} ${(amp + Math.sin((x / w) * 4 * Math.PI + phase) * amp).toFixed(1)}`;
  return `${d} L${w * 2} ${h} L0 ${h}Z`;
}

function Wave({ size, amp, phase, duration, reverse, fill, opacity }: { size: number; amp: number; phase: number; duration: number; reverse?: boolean; fill: string; opacity: number }) {
  const x = useSharedValue(reverse ? -size : 0);
  useEffect(() => {
    x.value = withRepeat(withTiming(reverse ? 0 : -size, { duration, easing: Easing.linear, reduceMotion: ReduceMotion.System }), -1);
  }, [x, size, duration, reverse]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: -10, width: size * 2, height: size + 10, opacity }, style]}>
      <Svg width={size * 2} height={size + 10}>
        <Defs>
          <LinearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#fbe6bb" />
            <Stop offset="1" stopColor="#a87634" />
          </LinearGradient>
        </Defs>
        <Path d={wavePath(size, size + 10, amp, phase)} fill={fill} />
      </Svg>
    </Animated.View>
  );
}

/** Glass sphere filled with sloshing liquid gold. `pct` is 0–1. */
export function Orb({ size, pct, children }: { size: number; pct: number; children?: ReactNode }) {
  const fill = Math.min(Math.max(pct, 0), 1);
  const dark = useColorScheme() === 'dark';
  const level = useSharedValue(0);
  useEffect(() => {
    level.value = withDelay(300, withTiming(fill, { duration: 2400, easing: Easing.out(Easing.exp), reduceMotion: ReduceMotion.System }));
  }, [level, fill]);
  const liquid = useAnimatedStyle(() => ({ height: `${level.value * 100}%` }));
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${Math.round(fill * 100)}% saved`}
      style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: dark ? 'rgba(255,255,255,0.18)' : '#fff', shadowColor: '#aa783c', shadowOpacity: 0.35, shadowRadius: 30, shadowOffset: { width: 0, height: 18 } }}
    >
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'visible' }, liquid]}>
        <Wave size={size} amp={7} phase={1.6} duration={8000} reverse fill="#c4934f" opacity={0.5} />
        <Wave size={size} amp={6} phase={0} duration={5000} fill="url(#g)" opacity={1} />
      </Animated.View>
      <Svg width={size} height={size} style={{ position: 'absolute' }} pointerEvents="none">
        <Defs>
          <RadialGradient id="hl" cx="30%" cy="22%" r="25%">
            <Stop offset="0" stopColor="#fff" stopOpacity={0.75} />
            <Stop offset="1" stopColor="#fff" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={size} height={size} fill="url(#hl)" />
      </Svg>
      <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
    </View>
  );
}
