import { budgetStatus, daysLeftInMonth, formatCompact, formatMoney, safeToSpendToday } from '@velora/core';
import { useBills, useBudget, useCurrency } from '@velora/data';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ring } from '@/components/ring';
import { Empty, ErrorText, Glass, Heading, Label, Screen, T } from '@/components/ui';

const COLORS = { ok: '#2a8fb8', near: '#c99b5b', over: '#d7553d' } as const;

export default function Budgets() {
  const currency = useCurrency();
  const budget = useBudget();
  const { data: bills = [] } = useBills();
  const lines = budget.data ?? [];
  const budgeted = lines.reduce((s, l) => s + l.budgeted, 0);
  const spent = lines.reduce((s, l) => s + l.spent, 0);
  const remaining = lines.reduce((s, l) => s + Math.max(budgetStatus(l).remaining, 0), 0);
  const end = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);
  const billsDue = bills.filter((b) => b.currency === currency && !b.autopay && b.next_due_on <= end).reduce((s, b) => s + b.amount, 0);

  return (
    <Screen>
      <Heading label={`${new Date().toLocaleString('en', { month: 'long' })} · ${daysLeftInMonth()} ${daysLeftInMonth() === 1 ? 'day' : 'days'} left`} title="Spend with" accent="intent." />
      <ErrorText error={budget.error} />
      {lines.length === 0 && !budget.isPending ? (
        <Glass className="p-2"><Empty title="No budget yet" body="Set category limits on the web app — they sync here instantly." /></Glass>
      ) : (
        <>
          <Glass index={1} className="flex-row items-center justify-around p-5">
            <View className="items-center">
              <View>
                <Ring size={120} value={budgeted ? spent / budgeted : 0} color={spent > budgeted ? COLORS.over : '#a87634'} label="Budget spent" />
                <View className="absolute inset-0 items-center justify-center"><T className="font-serif text-[28px]">{budgeted ? Math.round((spent / budgeted) * 100) : 0}%</T></View>
              </View>
              <T className="mt-2 text-[13px] font-medium">Overall</T>
              <T className="text-[12px] text-faint">{formatCompact(spent, currency)} / {formatCompact(budgeted, currency)}</T>
            </View>
            <View className="items-center gap-1">
              <Label>Safe today</Label>
              <T className="font-serif text-[40px]">{formatCompact(safeToSpendToday({ remainingBudget: remaining, billsDue }), currency)}</T>
              <T className="text-[12px] text-positive">after upcoming bills</T>
            </View>
          </Glass>
          <Glass index={2} className="gap-5 p-5">
            {lines.map((l, i) => {
              const st = budgetStatus(l);
              return (
                <View key={l.category_id} className="gap-2">
                  <View className="flex-row justify-between">
                    <T className="text-[14px]">{l.icon} {l.name}</T>
                    <T className={st.state === 'over' ? 'text-[13px] text-negative' : 'text-[13px] text-muted'}>{formatMoney(l.spent, currency)} / {formatMoney(l.budgeted, currency)}</T>
                  </View>
                  <View className="h-2 overflow-hidden rounded-full bg-text/10" accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(st.ratio * 100) }}>
                    <Animated.View entering={FadeIn.delay(400 + i * 90).duration(900)} style={{ width: `${Math.min(st.ratio, 1) * 100}%`, height: '100%', borderRadius: 99, backgroundColor: COLORS[st.state] }} />
                  </View>
                </View>
              );
            })}
          </Glass>
        </>
      )}
    </Screen>
  );
}
