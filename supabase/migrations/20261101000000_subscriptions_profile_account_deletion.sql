-- Subscriptions live alongside bills (same reminders/roll-forward), told apart by `kind`.
-- `website` is a bare domain (e.g. netflix.com) used only to show the brand logo.
alter table public.recurring_items
  add column kind text not null default 'bill' check (kind in ('bill', 'subscription')),
  add column website text check (website ~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$');

-- Sign-ups through Google & co. send `full_name`/`name` instead of `display_name`.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  c public.country := coalesce(nullif(new.raw_user_meta_data ->> 'home_country', '')::public.country, 'US');
begin
  insert into public.profiles (id, display_name, home_country, base_currency, timezone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    c,
    case c when 'IN' then 'INR'::public.currency else 'USD'::public.currency end,
    case c when 'IN' then 'Asia/Kolkata' else 'America/New_York' end
  );
  return new;
end $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Lets a signed-in user delete their own account. Every table references auth.users with
-- ON DELETE CASCADE, so this removes all of their data too. Required by the app stores.
create function public.delete_my_account() returns void
language sql security definer set search_path = '' as $$
  delete from auth.users where id = auth.uid();
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
