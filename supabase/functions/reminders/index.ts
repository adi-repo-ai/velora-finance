// Hourly (pg_cron → pg_net): reminders for bills and subscriptions, then roll overdue autopay items forward.
//   • Push (Expo) `remind_days_before` days ahead, to every phone the user turned reminders on for.
//   • Email (Brevo) for subscriptions, at least 7 days ahead. Needs BREVO_API_KEY and BREVO_SENDER_EMAIL.
// Each (item, due date, channel) is claimed in notifications_log first, so nothing is ever sent twice.
import { createClient } from 'npm:@supabase/supabase-js@2';

type Item = {
  id: string; user_id: string; name: string; amount: number; currency: 'USD' | 'INR'; next_due_on: string;
  remind_days_before: number; kind: 'bill' | 'subscription'; autopay: boolean;
};

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const BREVO_KEY = Deno.env.get('BREVO_API_KEY');
const SENDER = Deno.env.get('BREVO_SENDER_EMAIL');
const SITE = Deno.env.get('SITE_URL') ?? '';
const EMAIL_DAYS = 7;
const DAY = 86_400_000;

const money = (minor: number, currency: Item['currency']) =>
  new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(minor / 100);
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

async function claim(item: Item, channel: 'push' | 'email') {
  const { error } = await supabase.from('notifications_log').insert({ recurring_item_id: item.id, due_on: item.next_due_on, channel });
  return !error; // a conflict means an earlier run already handled it
}
const release = (item: Item, channel: 'push' | 'email') =>
  supabase.from('notifications_log').delete().match({ recurring_item_id: item.id, due_on: item.next_due_on, channel });

async function sendPush(item: Item, when: string) {
  const { data: tokens } = await supabase.from('push_tokens').select('token').eq('user_id', item.user_id);
  if (!tokens?.length) return true;
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(Deno.env.get('EXPO_ACCESS_TOKEN') && { Authorization: `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}` }) },
    body: JSON.stringify(tokens.map(({ token }) => ({
      to: token,
      title: `${item.name} ${item.kind === 'subscription' ? 'renews' : 'due'} ${when}`,
      body: `${money(item.amount, item.currency)} · tap to ${item.kind === 'subscription' ? 'review' : 'mark paid'}`,
      data: { url: item.kind === 'subscription' ? '/subscriptions' : `/bills?id=${item.id}` },
    }))),
  });
  if (!res.ok) return false;
  // Drop tokens Expo reports as unregistered (app uninstalled).
  const { data: tickets } = (await res.json()) as { data: { status: string; details?: { error?: string } }[] };
  const dead = tokens.filter((_, i) => tickets[i]?.details?.error === 'DeviceNotRegistered').map((t) => t.token);
  if (dead.length) await supabase.from('push_tokens').delete().in('token', dead);
  return true;
}

async function sendEmail(item: Item, when: string) {
  const { data } = await supabase.auth.admin.getUserById(item.user_id);
  const to = data.user?.email;
  if (!to) return true;
  const name = escape(item.name);
  const amount = money(item.amount, item.currency);
  const date = new Date(`${item.next_due_on}T00:00:00Z`).toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': BREVO_KEY! },
    body: JSON.stringify({
      sender: { email: SENDER, name: 'Velora' },
      to: [{ email: to }],
      subject: `${item.name} renews ${when} · ${amount}`,
      htmlContent: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;color:#2b1c0e">
        <h2 style="font-weight:500">${name} renews ${escape(when)}</h2>
        <p style="font-size:28px;margin:8px 0">${escape(amount)}</p>
        <p>on ${escape(date)}${item.autopay ? ', charged automatically.' : '. You pay this one manually.'}</p>
        <p>Not using it any more? Cancel with ${name} before then.</p>
        ${SITE ? `<p><a href="${escape(SITE)}/subscriptions" style="color:#7a5226">Review your subscriptions</a></p>` : ''}
        <p style="color:#8a7a68;font-size:12px">You get this because reminders are on for ${name} in Velora. Turn them off on the subscription.</p>
      </div>`,
    }),
  });
  return res.ok;
}

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) return new Response('forbidden', { status: 403 });

  const today = new Date(isoDate(new Date()));
  const { data, error } = await supabase
    .from('recurring_items')
    .select('id, user_id, name, amount, currency, next_due_on, remind_days_before, kind, autopay')
    .eq('notify', true)
    .gte('next_due_on', isoDate(today))
    .lte('next_due_on', isoDate(new Date(today.getTime() + 30 * DAY)));
  if (error) return new Response(error.message, { status: 500 });

  const sent = { push: 0, email: 0 };
  for (const item of data as Item[]) {
    const days = Math.round((new Date(item.next_due_on).getTime() - today.getTime()) / DAY);
    const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;

    if (days <= item.remind_days_before && (await claim(item, 'push'))) {
      if (await sendPush(item, when)) sent.push++;
      else await release(item, 'push'); // retry next hour
    }
    const emailDays = Math.max(EMAIL_DAYS, item.remind_days_before);
    if (BREVO_KEY && SENDER && item.kind === 'subscription' && days <= emailDays && (await claim(item, 'email'))) {
      if (await sendEmail(item, when)) sent.email++;
      else await release(item, 'email');
    }
  }

  // Autopay items whose date has passed are considered paid: roll them to the next cycle.
  const { data: overdue } = await supabase.from('recurring_items').select('id').eq('autopay', true).lt('next_due_on', isoDate(today));
  for (const { id } of overdue ?? []) await supabase.rpc('mark_bill_paid', { p_item: id });

  return Response.json({ checked: data.length, sent, rolled: overdue?.length ?? 0 });
});
