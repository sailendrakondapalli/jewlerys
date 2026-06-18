-- ============================================================
-- PROMO CODES MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Promo codes table
create table if not exists promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  discount_type text not null default 'percentage', -- 'percentage' | 'flat'
  discount_value numeric not null,                   -- % or ₹ amount
  min_order_amount numeric default 0,                -- minimum cart total to apply
  applicable_category text default null,             -- null = all categories
  is_one_time boolean default false,                 -- true = each user can use only once
  is_active boolean default true,
  expires_at timestamptz default null,               -- null = no expiry
  created_at timestamptz default now()
);

-- 2. Track which users have used which codes
create table if not exists promo_code_uses (
  id uuid primary key default gen_random_uuid(),
  code_id uuid references promo_codes(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  order_id uuid default null,
  used_at timestamptz default now(),
  unique(code_id, user_id)   -- one row per user per code
);

-- 3. RLS
alter table promo_codes enable row level security;
alter table promo_code_uses enable row level security;

-- Anyone can read active codes (needed to show on product page)
create policy "Public can read active promo codes"
  on promo_codes for select using (is_active = true);

-- Admins can do everything on promo_codes
create policy "Admins manage promo codes"
  on promo_codes for all
  using (auth.jwt() ->> 'role' = 'admin' or auth.jwt() ->> 'email' in (
    'sailendrakondapalli@gmail.com','adduriaswani@gmail.com',
    'susmithajewlaries@gmail.com','nashejewels@gmail.com',
    'naveenreddygandluri51@gmail.com','aswaniadduri11@gmail.com',
    'ssbmanogna@gmail.com'
  ));

-- Users can read their own uses
create policy "Users read own promo uses"
  on promo_code_uses for select using (auth.uid() = user_id);

-- Users can insert their own uses
create policy "Users insert own promo uses"
  on promo_code_uses for insert with check (auth.uid() = user_id);

-- Admins can read all uses
create policy "Admins read all promo uses"
  on promo_code_uses for select
  using (auth.jwt() ->> 'role' = 'admin' or auth.jwt() ->> 'email' in (
    'sailendrakondapalli@gmail.com','adduriaswani@gmail.com',
    'susmithajewlaries@gmail.com','nashejewels@gmail.com',
    'naveenreddygandluri51@gmail.com','aswaniadduri11@gmail.com',
    'ssbmanogna@gmail.com'
  ));
