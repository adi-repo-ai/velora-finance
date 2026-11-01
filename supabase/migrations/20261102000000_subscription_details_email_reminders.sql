-- Richer subscriptions: a category for grouping, notes, the email the service is billed to,
-- an optional custom logo, and a switch for reminders.
alter table public.recurring_items
  add column category text check (category in (
    'streaming', 'music', 'cloud', 'software', 'ai', 'gaming', 'news', 'fitness', 'education', 'food', 'shopping', 'telecom', 'other')),
  add column description text check (length(description) <= 300),
  add column account_email text check (length(account_email) <= 254 and account_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  -- A small re-encoded image (the app resizes uploads to 128px). Raster only: no SVG, so nothing can execute.
  add column logo text check (length(logo) <= 60000 and logo ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$'),
  add column notify boolean not null default true;

-- Reminders now go out by push and by email; each channel is claimed separately.
alter table public.notifications_log add column channel text not null default 'push' check (channel in ('push', 'email'));
alter table public.notifications_log drop constraint notifications_log_pkey;
alter table public.notifications_log add primary key (recurring_item_id, due_on, channel);
