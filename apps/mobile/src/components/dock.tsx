import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { T } from './ui';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const ICONS: Record<string, (color: string) => React.ReactNode> = {
  index: (c) => <Path d="M3.5 10.2 12 3.5l8.5 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-4.5v-6h-5v6H5A1.5 1.5 0 0 1 3.5 19z" stroke={c} strokeWidth={1.8} strokeLinejoin="round" fill="none" />,
  budgets: (c) => (
    <>
      <Path d="M11 4a8.5 8.5 0 1 0 9 9h-9z" stroke={c} strokeWidth={1.8} strokeLinejoin="round" fill="none" />
      <Path d="M14 3.2a8.5 8.5 0 0 1 6.8 6.8H14z" stroke={c} strokeWidth={1.8} strokeLinejoin="round" fill="none" />
    </>
  ),
  goals: (c) => (
    <>
      <Circle cx={12} cy={12} r={8.5} stroke={c} strokeWidth={1.8} fill="none" />
      <Circle cx={12} cy={12} r={4.5} stroke={c} strokeWidth={1.8} fill="none" />
      <Circle cx={12} cy={12} r={1.3} fill={c} />
    </>
  ),
  bills: (c) => (
    <>
      <Rect x={3.5} y={5} width={17} height={15.5} rx={3} stroke={c} strokeWidth={1.8} fill="none" />
      <Path d="M3.5 10h17M8 3v4M16 3v4" stroke={c} strokeWidth={1.8} strokeLinecap="round" />
    </>
  ),
};

const LABELS: Record<string, string> = { index: 'Home', budgets: 'Budgets', goals: 'Goals', bills: 'Bills' };
const liquid = Platform.OS === 'ios' && isLiquidGlassAvailable();

/**
 * Floating Pearl dock: a glass pill whose active tab expands to show its label,
 * with the gold quick-add button in the middle. Same look on iOS, Android and web.
 */
export function Dock({ state, emitter, navigateToTab }: TabBarProps) {
  const { bottom } = useSafeAreaInsets();
  const items = state.routes.map((route, i) => {
    const focused = state.index === i;
    const color = focused ? '#7A5226' : 'rgba(23,20,15,0.45)';
    const onPress = () => {
      const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) {
        Haptics.selectionAsync();
        navigateToTab(route.key);
      }
    };
    return (
      <Animated.View key={route.key} layout={LinearTransition.springify().damping(20).stiffness(220)}>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: focused }}
          accessibilityLabel={LABELS[route.name] ?? route.name}
          onPress={onPress}
          hitSlop={4}
          className={focused ? 'h-[50px] flex-row items-center gap-2 rounded-full bg-white px-4' : 'h-[50px] w-[50px] items-center justify-center rounded-full'}
          style={focused ? { shadowColor: '#503c1e', shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 } : undefined}
        >
          <Svg width={22} height={22} viewBox="0 0 24 24">{ICONS[route.name]?.(color)}</Svg>
          {focused && (
            <Animated.View entering={FadeIn.duration(220)}>
              <T className="font-semibold text-[13px] text-gold-2">{LABELS[route.name] ?? route.name}</T>
            </Animated.View>
          )}
        </Pressable>
      </Animated.View>
    );
  });

  // Outer view carries the glow; the pressable is clipped to the circle so nothing square shows behind it.
  const add = (
    <View key="add" style={{ marginHorizontal: 4, width: 54, height: 54, borderRadius: 27, shadowColor: '#7a5226', shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add transaction"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/add');
        }}
        style={({ pressed }) => ({ width: 54, height: 54, borderRadius: 27, overflow: 'hidden', transform: [{ scale: pressed ? 0.95 : 1 }] })}
      >
        <LinearGradient colors={['#d9b07a', '#7a5226']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 27, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)' }}>
          <Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" /></Svg>
        </LinearGradient>
      </Pressable>
    </View>
  );
  items.splice(Math.ceil(items.length / 2), 0, add);

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: bottom + 10, alignItems: 'center' }}>
      <View
        accessibilityRole="tablist"
        className="flex-row items-center gap-1 overflow-hidden rounded-full border border-white/90 p-[6px]"
        style={{ backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.45)', shadowColor: '#503c1e', shadowOpacity: 0.22, shadowRadius: 28, shadowOffset: { width: 0, height: 14 }, elevation: 8 }}
      >
        {liquid ? <GlassView glassEffectStyle="regular" style={{ position: 'absolute', inset: 0 }} />
          : Platform.OS !== 'android' && <BlurView intensity={50} tint="light" style={{ position: 'absolute', inset: 0 }} />}
        {items}
      </View>
    </View>
  );
}
