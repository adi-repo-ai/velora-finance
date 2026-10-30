// Hourly (pg_cron → pg_net): push bill reminders via Expo and roll overdue autopay bills forward.
import { createClient } from 'npm:@supabase/supabase-js@2';

type Bill = { id: string; user_id: string; name: string; amount: number; currency: 'USD' | 'INR'; next_due_on: string; remind_days_before: number };

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const money = (minor: number, currency: Bill['currency']) =>
  new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(minor / 100);

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) return new Response('forbidden', { status: 403 });

  const today = new Date();
  const horizon = new Date(today.getTime() + 30 * 86_400_000);
  const { data: bills, error } = await supabase
    .from('recurring_items')
    .select('id, user_id, name, amount, currency, next_due_on, remind_days_before')
    .gte('next_due_on', isoDate(today))
    .lte('next_due_on', isoDate(horizon));
  if (error) return new Response(error.message, { status: 500 });

  const due = (bills as Bill[]).filter(
    (b) => new Date(b.next_due_on).getTime() - b.remind_days_before * 86_400_000 <= today.getTime(),
  );

  let sent = 0;
  for (const bill of due) {
    // Claim the (bill, due date) slot first; a conflict means another run already sent it.
    const { error: claimError } = await supabase.from('notifications_log').insert({ recurring_item_id: bill.id, due_on: bill.next_due_on });
    if (claimError) continue;

    const { data: tokens } = await supabase.from('push_tokens').select('token').eq('user_id', bill.user_id);
    if (!tokens?.length) continue;

    const days = Math.round((new Date(bill.next_due_on).getTime() - new Date(isoDate(today)).getTime()) / 86_400_000);
    const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(Deno.env.get('EXPO_ACCESS_TOKEN') && { Authorization: `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}` }) },
      body: JSON.stringify(
        tokens.map(({ token }) => ({
          to: token,
          title: `${bill.name} due ${when}`,
          body: `${money(bill.amount, bill.currency)} · tap to mark paid`,
          data: { url: `/bills?id=${bill.id}` },
        })),
      ),
    });
    if (!res.ok) {
      // Release the claim so the next hourly run retries.
      await supabase.from('notifications_log').delete().match({ recurring_item_id: bill.id, due_on: bill.next_due_on });
      continue;
    }
    // Drop tokens Expo reports as unregistered (app uninstalled).
    const { data: tickets } = (await res.json()) as { data: { status: string; details?: { error?: string } }[] };
    const dead = tokens.filter((_, i) => tickets[i]?.details?.error === 'DeviceNotRegistered').map((t) => t.token);
    if (dead.length) await supabase.from('push_tokens').delete().in('token', dead);
    sent++;
  }

  // Autopay bills whose date has passed are considered paid: roll them to the next cycle.
  const { data: overdue } = await supabase.from('recurring_items').select('id').eq('autopay', true).lt('next_due_on', isoDate(today));
  for (const { id } of overdue ?? []) await supabase.rpc('mark_bill_paid', { p_item: id });

  return Response.json({ checked: bills.length, sent, rolled: overdue?.length ?? 0 });
});
