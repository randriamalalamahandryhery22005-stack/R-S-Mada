-- TAFAß REAL SOCIAL NETWORK — SUPABASE SCHEMA
-- Exécutez ce script dans Supabase > SQL Editor.
-- Il crée les tables, RLS, storage policies et realtime.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  country text default 'Madagascar',
  birth date,
  gender text,
  bio text default '',
  avatar_url text,
  role text not null default 'user' check (role in ('user','admin')),
  verified boolean not null default false,
  verified_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  text text default '',
  media_url text,
  media_type text,
  privacy text not null default 'public' check (privacy in ('public','friends','private')),
  created_at timestamptz not null default now()
);

create table if not exists public.post_likes (
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(post_id,user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user uuid references public.profiles(id) on delete cascade,
  to_user uuid references public.profiles(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  unique(from_user,to_user)
);

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  category text default 'Autre',
  bio text default '',
  avatar_url text,
  verified boolean not null default false,
  followers_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.page_followers (
  page_id uuid references public.pages(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(page_id,user_id)
);

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  text text default '',
  media_url text,
  media_type text,
  expires_at timestamptz not null default now()+interval '24 hours',
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'private' check(kind in ('private','group')),
  name text,
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  primary key(conversation_id,user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete cascade,
  text text default '',
  file_url text,
  file_name text,
  file_type text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null default 'system',
  text text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  category text,
  reason text,
  payment_method text,
  proof_url text,
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  amount_ar integer not null default 25000,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  plan text not null default 'verified_monthly',
  amount_ar integer not null default 25000,
  status text not null default 'pending' check(status in ('pending','active','expired','cancelled')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists posts_created_idx on public.posts(created_at desc);
create index if not exists messages_conversation_idx on public.messages(conversation_id,created_at);
create index if not exists notifications_user_idx on public.notifications(user_id,created_at desc);

-- Profile creation after signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path=public
as $$
begin
  insert into public.profiles(id,name,email,phone,country)
  values(
    new.id,
    coalesce(new.raw_user_meta_data->>'name','Utilisateur Tafaß'),
    new.email,
    new.phone,
    coalesce(new.raw_user_meta_data->>'country','Madagascar')
  )
  on conflict(id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Helpers
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin'); $$;

create or replace function public.is_member(cid uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.conversation_members where conversation_id=cid and user_id=auth.uid()); $$;

-- RLS
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
alter table public.friend_requests enable row level security;
alter table public.pages enable row level security;
alter table public.page_followers enable row level security;
alter table public.stories enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.verification_requests enable row level security;
alter table public.subscriptions enable row level security;

create policy "profiles readable" on public.profiles for select to authenticated using(true);
create policy "own profile update" on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());

create policy "public posts read" on public.posts for select to authenticated
using(privacy='public' or user_id=auth.uid() or privacy='friends');
create policy "own posts insert" on public.posts for insert to authenticated with check(user_id=auth.uid());
create policy "own posts update" on public.posts for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "own posts delete" on public.posts for delete to authenticated using(user_id=auth.uid());

create policy "likes read" on public.post_likes for select to authenticated using(true);
create policy "likes own insert" on public.post_likes for insert to authenticated with check(user_id=auth.uid());
create policy "likes own delete" on public.post_likes for delete to authenticated using(user_id=auth.uid());

create policy "comments read" on public.comments for select to authenticated using(true);
create policy "comments insert" on public.comments for insert to authenticated with check(user_id=auth.uid());
create policy "comments own delete" on public.comments for delete to authenticated using(user_id=auth.uid());

create policy "friend request read" on public.friend_requests for select to authenticated
using(from_user=auth.uid() or to_user=auth.uid());
create policy "friend request insert" on public.friend_requests for insert to authenticated
with check(from_user=auth.uid());
create policy "friend request update" on public.friend_requests for update to authenticated
using(to_user=auth.uid() or from_user=auth.uid());

create policy "pages read" on public.pages for select to authenticated using(true);
create policy "page owner insert" on public.pages for insert to authenticated with check(owner_id=auth.uid());
create policy "page owner update" on public.pages for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());

create policy "followers read" on public.page_followers for select to authenticated using(true);
create policy "followers insert" on public.page_followers for insert to authenticated with check(user_id=auth.uid());
create policy "followers delete" on public.page_followers for delete to authenticated using(user_id=auth.uid());

create policy "stories read" on public.stories for select to authenticated using(expires_at>now() or user_id=auth.uid());
create policy "story own insert" on public.stories for insert to authenticated with check(user_id=auth.uid());
create policy "story own delete" on public.stories for delete to authenticated using(user_id=auth.uid());

create policy "conversation members read own" on public.conversation_members for select to authenticated using(user_id=auth.uid() or public.is_member(conversation_id));
create policy "conversation insert" on public.conversations for insert to authenticated with check(true);
create policy "member insert" on public.conversation_members for insert to authenticated with check(user_id=auth.uid() or public.is_admin());

create policy "messages member read" on public.messages for select to authenticated using(public.is_member(conversation_id));
create policy "messages member insert" on public.messages for insert to authenticated
with check(sender_id=auth.uid() and public.is_member(conversation_id));

create policy "notifications own read" on public.notifications for select to authenticated using(user_id=auth.uid());
create policy "notifications own update" on public.notifications for update to authenticated using(user_id=auth.uid());
create policy "notifications insert" on public.notifications for insert to authenticated with check(true);

create policy "verification own read" on public.verification_requests for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy "verification own insert" on public.verification_requests for insert to authenticated with check(user_id=auth.uid());
create policy "verification admin update" on public.verification_requests for update to authenticated using(public.is_admin());

create policy "subscription own read" on public.subscriptions for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy "subscription admin insert" on public.subscriptions for insert to authenticated with check(public.is_admin());
create policy "subscription admin update" on public.subscriptions for update to authenticated using(public.is_admin());

-- Storage
insert into storage.buckets(id,name,public) values
('avatars','avatars',true),
('media','media',true),
('files','files',false)
on conflict(id) do nothing;

create policy "avatars public read" on storage.objects for select using(bucket_id='avatars');
create policy "avatars auth upload" on storage.objects for insert to authenticated with check(bucket_id='avatars');
create policy "avatars own update" on storage.objects for update to authenticated using(bucket_id='avatars' and owner=auth.uid());

create policy "media public read" on storage.objects for select using(bucket_id='media');
create policy "media auth upload" on storage.objects for insert to authenticated with check(bucket_id='media');
create policy "media own update" on storage.objects for update to authenticated using(bucket_id='media' and owner=auth.uid());

create policy "files member read" on storage.objects for select to authenticated using(bucket_id='files');
create policy "files auth upload" on storage.objects for insert to authenticated with check(bucket_id='files');

-- Realtime
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.post_likes;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.friend_requests;
alter publication supabase_realtime add table public.stories;
