-- RLS and reporting tests. Run after auth_stub.sql and the migrations (see .github/workflows/ci.yml).
\set ON_ERROR_STOP on
insert into auth.users values
 ('11111111-1111-1111-1111-111111111111', '{"display_name":"Alex","home_country":"US"}'),
 ('22222222-2222-2222-2222-222222222222', '{"display_name":"Priya","home_country":"IN"}');
select display_name, home_country, base_currency, timezone from profiles order by display_name;

set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into accounts (id, name, type, currency, opening_balance) values ('aaaaaaaa-0000-0000-0000-00000000000b', 'HDFC Savings', 'savings', 'INR', 10000000);
insert into transactions (account_id, posted_on, amount, description, category_id, source, external_id)
  select 'aaaaaaaa-0000-0000-0000-00000000000b', date_trunc('month', now())::date + 1, -48600, 'Swiggy', id, 'import', 'csv_1' from categories where name = 'Food & dining';
insert into transactions (account_id, posted_on, amount, description, category_id)
  select 'aaaaaaaa-0000-0000-0000-00000000000b', date_trunc('month', now())::date + 2, 18500000, 'Salary', id from categories where name = 'Salary';
insert into budget_lines (month, category_id, amount) select date_trunc('month', now())::date, id, 800000 from categories where name = 'Food & dining';
insert into goals (name, currency, target_amount) values ('Goa', 'INR', 6200000);

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into accounts (id, name, type, currency) values ('aaaaaaaa-0000-0000-0000-00000000000a', 'Chase', 'checking', 'USD');

-- 1. Alex cannot see Priya's data
do $$ begin
  assert (select count(*) from accounts) = 1, 'alex sees only own account';
  assert (select count(*) from transactions) = 0, 'alex sees no txns';
  assert (select count(*) from profiles) = 1, 'alex sees own profile only';
  assert (select count(*) from categories) = 13, 'built-in categories visible';
end $$;

-- 2. Alex cannot write into Priya's account
do $$ begin
  begin
    insert into transactions (account_id, posted_on, amount) values ('aaaaaaaa-0000-0000-0000-00000000000b', now(), -1);
    raise exception 'FAIL: cross-user insert allowed';
  exception when foreign_key_violation or insufficient_privilege then null; end;
  begin
    insert into accounts (user_id, name, type, currency) values ('22222222-2222-2222-2222-222222222222', 'x', 'cash', 'USD');
    raise exception 'FAIL: spoofed user_id allowed';
  exception when insufficient_privilege then null; end;
  update goals set saved_amount = 999; -- silently affects 0 rows
  begin insert into notifications_log values (gen_random_uuid(), now()); raise exception 'FAIL: log writable';
  exception when insufficient_privilege then null; end;
  begin update categories set name = 'hacked' where user_id is null;
    assert (select count(*) from categories where name = 'hacked') = 0, 'built-ins not editable';
  end;
end $$;

-- 3. Priya's reports
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
do $$ declare r record; begin
  assert (select balance from account_balances) = 10000000 - 48600 + 18500000, 'balance';
  assert (select total from month_summary(date_trunc('month', now())::date) where name = 'Food & dining') = -48600, 'summary';
  select * into r from budget_progress(date_trunc('month', now())::date);
  assert r.budgeted = 800000 and r.spent = 48600, 'budget progress';
  assert (select net_worth from net_worth_history(3) order by month desc limit 1) = 28451400, 'net worth';
  assert (select count(*) from net_worth_history(3)) = 3, '3 months';
  assert (select saved_amount from contribute_to_goal((select id from goals), 200000)) = 200000, 'goal';
  assert (select count(*) from goals where saved_amount = 999) = 0, 'alex update did not land';
end $$;

-- 4. duplicates from re-import are rejected
do $$ begin
  begin
    insert into transactions (account_id, posted_on, amount, external_id) values ('aaaaaaaa-0000-0000-0000-00000000000b', now(), -48600, 'csv_1');
    raise exception 'FAIL: duplicate import';
  exception when unique_violation then null; end;
end $$;

-- 5. Priya's own custom category cannot be used by Alex
insert into categories (id, name) values ('cccccccc-0000-0000-0000-000000000001', 'Chai');
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
do $$ begin
  begin
    insert into transactions (account_id, posted_on, amount, category_id) values ('aaaaaaaa-0000-0000-0000-00000000000a', now(), -100, 'cccccccc-0000-0000-0000-000000000001');
    raise exception 'FAIL: foreign category usable';
  exception when check_violation then null; end;
end $$;

-- 6. anon sees nothing
reset role; set role anon;
do $$ begin assert (select count(*) from accounts) = 0, 'anon'; end $$;
reset role;
select 'ALL RLS TESTS PASSED' as result;
