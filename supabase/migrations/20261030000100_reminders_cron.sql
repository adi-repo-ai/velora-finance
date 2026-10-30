-- Hourly call to the `reminders` Edge Function.
-- Needs two Vault secrets per environment (set once, outside migrations):
--   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--   select vault.create_secret('<CRON_SECRET>', 'cron_secret');
-- and the same CRON_SECRET set on the function: supabase secrets set CRON_SECRET=...
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'velora-reminders',
  '7 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  )
  $$
);
