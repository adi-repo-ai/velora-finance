import { formatCompact, formatMoney } from '@velora/core';
import { useAccounts, useCurrency, useMonthSummary, useNetWorth, useProfile, useTransactions } from '@velora/data';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { HeroMoney } from '@/components/money';
import { NetWorthChart } from '@/components/net-worth-chart';
import { Button, Empty, ErrorText, Glass, Label, Screen, T } from '@/components/ui';
import { signOutDevice } from '@/lib/push';

export default function Home() {
  const currency = useCurrency();
  const { data: profile } = useProfile();
  const accounts = useAccounts();
  const { data: history = [] } = useNetWorth(12);
  const { data: summary } = useMonthSummary();
  const { data: txns = [] } = useTransactions();
  const now = history.at(-1)?.net_worth ?? 0;
  const delta = now - (history[0]?.net_worth ?? 0);
  const greeting = profile?.home_country === 'IN' ? 'Namaste,' : 'Hello,';

  return (
    <Screen>
      <View className="flex-row items-center justify-between">
        <View>
          <T className="text-[13px] text-muted">{greeting}</T>
          <T className="font-serif text-[30px] leading-[34px]">{profile?.display_name || ' '}</T>
        </View>
        <View>
          <Pressable accessibilityRole="button" accessibilityLabel="Sign out" onPress={signOutDevice} className="h-11 items-center justify-center rounded-full border border-glass-edge bg-surface/60 px-4">
            <T className="text-[13px]">Sign out</T>
          </Pressable>
        </View>
      </View>

      <ErrorText error={accounts.error} />
      {accounts.data?.length === 0 ? (
        <Glass className="p-2">
          <Empty title="Let's map your money" body="Add a bank account, card or cash wallet with today's balance.">
            <Button title="Add your first account" className="mt-3 w-64" onPress={() => router.push('/account-new')} />
          </Empty>
        </Glass>
      ) : (
        <>
          <Glass index={1} className="gap-2 p-5 pb-0">
            <Label>Net worth · {currency}</Label>
            <HeroMoney minor={now} currency={currency} size={46} />
            <T className={delta >= 0 ? 'text-[13px] text-positive' : 'text-[13px] text-negative'}>
              {delta >= 0 ? '▲' : '▼'} {formatMoney(Math.abs(delta), currency)} past year
            </T>
            <View className="-mx-5 mt-1"><NetWorthChart data={history} /></View>
          </Glass>

          <View className="flex-row gap-3">
            <View className="flex-1"><Glass index={2} className="p-4">
              <Label>In · this month</Label>
              <T className="mt-1 font-serif text-[24px]">{formatCompact(summary?.income ?? 0, currency)}</T>
            </Glass></View>
            <View className="flex-1"><Glass index={3} className="p-4">
              <Label>Spent</Label>
              <T className="mt-1 font-serif text-[24px]">{formatCompact(summary?.spent ?? 0, currency)}</T>
            </Glass></View>
          </View>

          <Glass index={4} className="px-4 py-2">
            <View className="flex-row items-center justify-between py-2">
              <Label>Accounts</Label>
              <Pressable onPress={() => router.push('/account-new')} accessibilityRole="button"><T className="text-[13px] text-gold-2">+ Add</T></Pressable>
            </View>
            {accounts.data?.map((a) => (
              <View key={a.id} className="flex-row items-center border-t border-line py-3">
                <View className="flex-1"><T>{a.name}</T><T className="text-[12px] capitalize text-faint">{a.type}{a.mask ? ` · •• ${a.mask}` : ''}</T></View>
                <T className={a.balance < 0 ? 'font-serif text-[20px] text-negative' : 'font-serif text-[20px]'}>{formatMoney(a.balance, a.currency)}</T>
              </View>
            ))}
          </Glass>

          <Glass index={5} className="px-4 py-2">
            <Label className="py-2">Recent</Label>
            {txns.length === 0 && <T className="border-t border-line py-4 text-[14px] text-muted">No transactions this month yet. Tap + to add one.</T>}
            {txns.slice(0, 6).map((t) => (
              <View key={t.id} className="flex-row items-center gap-3 border-t border-line py-3">
                <View className="h-10 w-10 items-center justify-center rounded-2xl bg-surface/70"><T className="text-[18px]">{t.category?.icon ?? '•'}</T></View>
                <View className="flex-1">
                  <T numberOfLines={1}>{t.merchant || t.description || t.category?.name || 'Transaction'}</T>
                  <T className="text-[12px] text-faint">{t.category?.name ?? 'Uncategorised'} · {new Date(`${t.posted_on}T00:00:00`).toLocaleDateString('en', { day: 'numeric', month: 'short' })}</T>
                </View>
                <T className={t.amount > 0 ? 'font-serif text-[20px] text-positive' : 'font-serif text-[20px]'}>{formatMoney(t.amount, t.account?.currency ?? currency, { sign: true })}</T>
              </View>
            ))}
          </Glass>
        </>
      )}
    </Screen>
  );
}
