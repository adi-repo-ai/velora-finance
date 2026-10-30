import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { rgb, type ColorToken } from '@velora/config';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, useColorScheme, View, type PressableProps, type TextInputProps, type TextProps, type ViewProps } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ');

/** Text with Pearl defaults (Geist, ink colour). */
export function T({ className, ...props }: TextProps & { className?: string }) {
  return <Text className={cx('font-sans text-[15px] text-text', className)} {...props} />;
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <T className={cx('font-mono text-[11px] uppercase tracking-[1.6px] text-faint', className)}>{children}</T>;
}

const liquid = Platform.OS === 'ios' && isLiquidGlassAvailable();

/** Active theme for values NativeWind classes can't reach (blur tint, SVG strokes, placeholders). */
export function useTheme() {
  const dark = useColorScheme() === 'dark';
  return { dark, color: (token: ColorToken) => rgb(token, dark ? 'noir' : 'pearl') };
}

/**
 * Pearl glass surface: native Liquid Glass on iOS 26+, blur on older iOS,
 * and a solid translucent fill on Android where blur is expensive.
 */
export function Glass({ children, className, index = 0, ...props }: ViewProps & { className?: string; index?: number }) {
  const { dark } = useTheme();
  const body =
    liquid ? <GlassView glassEffectStyle="regular" tintColor={dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.35)'} style={{ position: 'absolute', inset: 0 }} />
    : Platform.OS === 'ios' ? <BlurView intensity={40} tint={dark ? 'dark' : 'light'} style={{ position: 'absolute', inset: 0 }} />
    : null;
  // NativeWind doesn't style Reanimated views, so the animated wrapper only carries motion + shadow.
  return (
    <Animated.View
      entering={FadeInDown.duration(900).delay(index * 110).springify().damping(18)}
      style={{ shadowColor: dark ? '#000' : '#503c1e', shadowOpacity: dark ? 0.5 : 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 16 }, elevation: 3, borderRadius: 28 }}
    >
      <View
        className={cx('overflow-hidden rounded-[28px] border border-glass-edge', Platform.OS === 'android' ? 'bg-surface/75' : 'bg-surface/40', className)}
        {...props}
      >
        {body}
        {children}
      </View>
    </Animated.View>
  );
}

/** Warm ambient backdrop + safe area + scroll, shared by every screen. */
export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const { dark } = useTheme();
  return (
    <View className="flex-1 bg-ink">
      <LinearGradient colors={dark ? ['#17120b', '#08090d', '#090e13', '#100c19'] : ['#efdfc6', '#f2eee6', '#e3ecf0', '#ece4f1']} locations={[0, 0.4, 0.75, 1]} style={{ position: 'absolute', inset: 0 }} />
      <SafeAreaView edges={['top']} className="flex-1">
        {scroll ? (
          <ScrollView contentContainerClassName="gap-4 px-5 pb-32 pt-4" contentInsetAdjustmentBehavior="automatic">{children}</ScrollView>
        ) : (
          <View className="flex-1 gap-4 px-5 pt-4">{children}</View>
        )}
      </SafeAreaView>
    </View>
  );
}

export function Heading({ label, title, accent }: { label: string; title: string; accent: string }) {
  return (
    <View className="gap-1.5">
      <Label>{label}</Label>
      <T className="font-serif text-[42px] leading-[44px]">
        {title} <T className="font-serif-italic text-[42px] leading-[44px] text-gold-2">{accent}</T>
      </T>
    </View>
  );
}

export function Button({ title, variant = 'gold', loading, className, ...props }: PressableProps & { title: string; variant?: 'gold' | 'glass'; loading?: boolean; className?: string }) {
  const gold = variant === 'gold';
  return (
    <Pressable accessibilityRole="button" disabled={loading || props.disabled} className={cx('active:scale-[0.98]', (loading || props.disabled) && 'opacity-50', className)} {...props}>
      {gold ? (
        <LinearGradient colors={['#c99b5b', '#7a5226']} style={{ height: 54, borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}>
          {loading ? <ActivityIndicator color="#fff" /> : <T className="font-semibold text-[16px] text-white">{title}</T>}
        </LinearGradient>
      ) : (
        <View className="h-[46px] items-center justify-center rounded-full border border-glass-edge bg-surface/70 px-5">
          <T className="font-medium">{title}</T>
        </View>
      )}
    </Pressable>
  );
}

export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  const { color } = useTheme();
  return (
    <View className="gap-2">
      <Label>{label}</Label>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={color('faint')}
        className={cx('h-12 rounded-2xl border bg-surface/80 px-4 font-sans text-[16px] text-text', error ? 'border-negative' : 'border-line')}
        {...props}
      />
      {error ? <T className="text-[13px] text-negative">{error}</T> : null}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress}
      className={cx('rounded-full border px-3.5 py-2', active ? 'border-gold-1 bg-surface' : 'border-line bg-surface/40')}>
      <T className={cx('text-[13px]', active ? 'text-text' : 'text-muted')}>{label}</T>
    </Pressable>
  );
}

export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null;
  return <T className="rounded-2xl bg-negative/10 px-4 py-3 text-[14px] text-negative">{error instanceof Error ? error.message : String(error)}</T>;
}

export function Empty({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <View className="items-center gap-2 px-4 py-10">
      <T className="font-serif text-[30px]">{title}</T>
      <T className="text-center text-[14px] text-muted">{body}</T>
      {children}
    </View>
  );
}
