-- Run this in your Supabase SQL Editor to set up the database.

-- Profiles table (one row per user, auto-created on signup)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  plan text not null default 'trial',               -- trial | active | lifetime | expired
  trial_ends_at timestamptz default now() + interval '14 days',
  stripe_customer_id text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table profiles enable row level security;

-- Users can read their own profile
create policy "Users can read own profile"
  on profiles for select using (auth.uid() = id);

-- Daily usage tracking
create table if not exists usage (
  id bigint generated always as identity primary key,
  user_id uuid references profiles(id) on delete cascade,
  date date default current_date,
  request_count int default 0,
  unique(user_id, date)
);

alter table usage enable row level security;

create policy "Users can read own usage"
  on usage for select using (auth.uid() = user_id);

-- Auto-create a profile row when a new user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
