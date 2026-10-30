import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, View, type PressableProps, type TextInputProps, type TextProps, type ViewProps } from 'react-native';
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

/**
 * Pearl glass surface: native Liquid Glass on iOS 26+, blur on older iOS,
 * and a solid translucent fill on Android where blur is expensive.
 */
export function Glass({ children, className, index = 0, ...props }: ViewProps & { className?: string; index?: number }) {
  const body =
    liquid ? <GlassView glassEffectStyle="regular" tintColor="rgba(255,255,255,0.35)" style={{ position: 'absolute', inset: 0 }} />
    : Platform.OS === 'ios' ? <BlurView intensity={40} tint="light" style={{ position: 'absolute', inset: 0 }} />
    : null;
  // NativeWind doesn't style Reanimated views, so the animated wrapper only carries motion + shadow.
  return (
    <Animated.View
      entering={FadeInDown.duration(900).delay(index * 110).springify().damping(18)}
      style={{ shadowColor: '#503c1e', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 16 }, elevation: 3, borderRadius: 28 }}
    >
      <View
        className={cx('overflow-hidden rounded-[28px] border border-white/90', Platform.OS === 'android' ? 'bg-white/75' : 'bg-white/40', className)}
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
  return (
    <View className="flex-1 bg-ink">
      <LinearGradient colors={['#efdfc6', '#f2eee6', '#e3ecf0', '#ece4f1']} locations={[0, 0.4, 0.75, 1]} style={{ position: 'absolute', inset: 0 }} />
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
        <View className="h-[46px] items-center justify-center rounded-full border border-white bg-white/70 px-5">
          <T className="font-medium">{title}</T>
        </View>
      )}
    </Pressable>
  );
}

export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return (
    <View className="gap-2">
      <Label>{label}</Label>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="rgba(23,20,15,0.4)"
        className={cx('h-12 rounded-2xl border bg-white/80 px-4 font-sans text-[16px] text-text', error ? 'border-negative' : 'border-line')}
        {...props}
      />
      {error ? <T className="text-[13px] text-negative">{error}</T> : null}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress}
      className={cx('rounded-full border px-3.5 py-2', active ? 'border-gold-1 bg-white' : 'border-line bg-white/40')}>
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
