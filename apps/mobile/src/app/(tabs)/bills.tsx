import { formatMoney } from '@velora/core';
import { useBills, useMarkBillPaid, useSavePushToken } from '@velora/data';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Empty, ErrorText, Glass, Heading, Screen, T } from '@/components/ui';
import { registerForPush, rememberPushToken } from '@/lib/push';

const daysUntil = (iso: string) => Math.ceil((new Date(`${iso}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000);

export default function Bills() {
  const bills = useBills();
  const paid = useMarkBillPaid();
  const save = useSavePushToken();
  const [pushNote, setPushNote] = useState<string | null>(null);

  async function enableReminders() {
    const r = await registerForPush();
    if ('error' in r) return setPushNote(r.error);
    save.mutate(r, { onSuccess: () => { rememberPushToken(r.token); setPushNote('Reminders are on for this device.'); } });
  }

  return (
    <Screen>
      <Heading label="Bills & subscriptions" title="Never" accent="miss one." />
      <Glass index={1} className="gap-3 p-5">
        <T className="text-[14px] text-muted">Get a notification a few days before each bill is due.</T>
        <Button title="Turn on reminders" variant="glass" onPress={enableReminders} loading={save.isPending} />
        {pushNote && <T className="text-[13px] text-gold-2">{pushNote}</T>}
        <ErrorText error={save.error} />
      </Glass>
      <ErrorText error={bills.error ?? paid.error} />
      <Glass index={2} className="px-4 py-1">
        {bills.data?.length === 0 && <Empty title="No bills yet" body="Add rent, cards and subscriptions on the web app." />}
        {bills.data?.map((b) => {
          const d = daysUntil(b.next_due_on);
          const due = new Date(`${b.next_due_on}T00:00:00`);
          return (
            <View key={b.id} className="flex-row items-center gap-3 border-b border-line py-3.5 last:border-b-0">
              <View className={d <= 3 ? 'h-12 w-12 items-center justify-center rounded-2xl border-[1.5px] border-gold-1 bg-white/70' : 'h-12 w-12 items-center justify-center rounded-2xl bg-white/70'}>
                <T className="font-serif text-[20px] leading-[22px]">{due.getDate()}</T>
                <T className="font-mono text-[9px] uppercase text-faint">{due.toLocaleString('en', { month: 'short' })}</T>
              </View>
              <View className="flex-1">
                <T>{b.name}</T>
                <T className={d < 0 ? 'text-[12px] text-negative' : 'text-[12px] text-faint'}>{d < 0 ? `${-d} ${d === -1 ? 'day' : 'days'} overdue` : d === 0 ? 'Due today' : `In ${d} ${d === 1 ? 'day' : 'days'}`}{b.autopay ? ' · autopay' : ''}</T>
              </View>
              <View className="items-end gap-1">
                <T className="font-serif text-[20px]">{formatMoney(b.amount, b.currency)}</T>
                <Pressable accessibilityRole="button" accessibilityLabel={`Mark ${b.name} paid`} disabled={paid.isPending} onPress={() => paid.mutate(b.id)}>
                  <T className="text-[12px] font-semibold text-gold-2">Mark paid</T>
                </Pressable>
              </View>
            </View>
          );
        })}
      </Glass>
    </Screen>
  );
}
