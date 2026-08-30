-- Run this in the Supabase SQL editor for your project.

create extension if not exists "uuid-ossp";

-- One row per customer business (e.g. "Heber & Dad's Pallet Flips")
create table businesses (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'free', -- 'free' | 'pro' (set by Stripe webhook later)
  created_at timestamptz not null default now()
);

-- Who belongs to which business (supports inviting a partner, e.g. your dad)
create table business_members (
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner', -- 'owner' | 'member'
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

-- The inventory itself
create table items (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  lot text,
  photo_url text,
  purchase_cost numeric(10, 2) not null default 0,
  retail_price numeric(10, 2) not null default 0,
  retail_url text,
  affiliate_url text,
  date_acquired date not null default current_date,
  status text not null default 'in_stock', -- 'in_stock' | 'sold'
  sold_price numeric(10, 2),
  payment_method text,
  date_sold date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index items_business_id_idx on items(business_id);

-- Photos + video for each item (Marketplace-style: up to 10 photos, 1 video)
create table item_media (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid not null references items(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  url text not null,
  storage_path text not null,
  type text not null check (type in ('photo', 'video')),
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index item_media_item_id_idx on item_media(item_id);

-- Cap enforcement: max 10 photos and 1 video per item
create or replace function check_item_media_limits()
returns trigger as $$
begin
  if new.type = 'photo' then
    if (select count(*) from item_media where item_id = new.item_id and type = 'photo') >= 10 then
      raise exception 'An item can have at most 10 photos';
    end if;
  elsif new.type = 'video' then
    if (select count(*) from item_media where item_id = new.item_id and type = 'video') >= 1 then
      raise exception 'An item can have at most 1 video';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger item_media_limit_check
  before insert on item_media
  for each row execute function check_item_media_limits();

-- ---------- Media: up to 10 photos + 1 video per item ----------
alter table items add column if not exists photo_urls text[] not null default '{}';
alter table items add column if not exists video_url text;

-- carry over any single photo_url from Phase 1 into the new array
update items set photo_urls = array[photo_url]
  where photo_url is not null and photo_url <> '' and photo_urls = '{}';

-- Storage bucket for uploaded photos/videos. Public read (so <img>/<video>
-- tags work without auth headers); writes are locked to business members.
insert into storage.buckets (id, name, public)
  values ('item-media', 'item-media', true)
  on conflict (id) do nothing;

create policy "public can view item media"
  on storage.objects for select
  using (bucket_id = 'item-media');

create policy "members can upload item media"
  on storage.objects for insert
  with check (
    bucket_id = 'item-media'
    and (storage.foldername(name))[1]::uuid in (
      select business_id from business_members where user_id = auth.uid()
    )
  );

create policy "members can delete item media"
  on storage.objects for delete
  using (
    bucket_id = 'item-media'
    and (storage.foldername(name))[1]::uuid in (
      select business_id from business_members where user_id = auth.uid()
    )
  );

-- ---------- Row Level Security ----------
-- Every table is locked down so a user can only ever see/touch data
-- belonging to a business they're a member of. This is what makes it
-- safe to have many unrelated customers on the same database.

alter table businesses enable row level security;
alter table business_members enable row level security;
alter table items enable row level security;

-- businesses: visible/manageable only to members
create policy "members can view their business"
  on businesses for select
  using (
    id in (select business_id from business_members where user_id = auth.uid())
  );

create policy "users can create a business they own"
  on businesses for insert
  with check (owner_id = auth.uid());

create policy "owner can update their business"
  on businesses for update
  using (owner_id = auth.uid());

-- business_members: visible to other members of the same business
create policy "members can view fellow members"
  on business_members for select
  using (
    business_id in (select business_id from business_members where user_id = auth.uid())
  );

create policy "owner can add members"
  on business_members for insert
  with check (
    business_id in (select id from businesses where owner_id = auth.uid())
    or user_id = auth.uid() -- lets a user add themself as owner right after creating a business
  );

create policy "owner can remove members"
  on business_members for delete
  using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

-- items: full CRUD, scoped to businesses the user belongs to
create policy "members can view items"
  on items for select
  using (
    business_id in (select business_id from business_members where user_id = auth.uid())
  );

create policy "members can insert items"
  on items for insert
  with check (
    business_id in (select business_id from business_members where user_id = auth.uid())
  );

create policy "members can update items"
  on items for update
  using (
    business_id in (select business_id from business_members where user_id = auth.uid())
  );

create policy "members can delete items"
  on items for delete
  using (
    business_id in (select business_id from business_members where user_id = auth.uid())
  );

-- item_media: same scoping pattern as items
create policy "members can view item media"
  on item_media for select
  using (
    business_id in (select business_id from business_members where user_id = auth.uid())
  );

create policy "members can insert item media"
  on item_media for insert
  with check (
    business_id in (select business_id from business_members where user_id = auth.uid())
  );

create policy "members can delete item media"
  on item_media for delete
  using (
    business_id in (select business_id from business_members where user_id = auth.uid())
  );

-- ---------- Storage: item-media bucket ----------
-- Public bucket so photos/videos render directly via public URL without
-- signed-URL plumbing. Files are still only writable/deletable by members
-- of the business that owns them (enforced below), and paths are
-- unguessable UUIDs, not indexed or listed anywhere public.

insert into storage.buckets (id, name, public)
values ('item-media', 'item-media', true)
on conflict (id) do nothing;

-- Object paths must be: {business_id}/{item_id}/{filename}
create policy "members can upload item media files"
  on storage.objects for insert
  with check (
    bucket_id = 'item-media'
    and (storage.foldername(name))[1]::uuid in (
      select business_id from business_members where user_id = auth.uid()
    )
  );

create policy "members can delete item media files"
  on storage.objects for delete
  using (
    bucket_id = 'item-media'
    and (storage.foldername(name))[1]::uuid in (
      select business_id from business_members where user_id = auth.uid()
    )
  );

create policy "anyone can view item media files"
  on storage.objects for select
  using (bucket_id = 'item-media');

-- ---------- Migration safety ----------
-- If you already ran an earlier version of this file, this line alone
-- adds the new column without touching anything else. Safe to re-run.
alter table items add column if not exists affiliate_url text;

-- ---------- Invite-a-partner ----------
create extension if not exists pgcrypto;

create table if not exists invites (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  email text,
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  invited_by uuid not null references auth.users(id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_by uuid references auth.users(id),
  accepted_at timestamptz
);

alter table invites enable row level security;

do $$ begin
  create policy "owner manages invites"
    on invites for all
    using (business_id in (select id from businesses where owner_id = auth.uid()))
    with check (business_id in (select id from businesses where owner_id = auth.uid()));
exception when duplicate_object then null; end $$;

-- Lets anyone (even signed out) preview an invite before logging in, without
-- exposing the invites table itself to public SELECT.
create or replace function get_invite_details(p_token text)
returns table (business_name text, status text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select b.name, i.status, i.expires_at
    from invites i
    join businesses b on b.id = i.business_id
    where i.token = p_token;
end;
$$;
grant execute on function get_invite_details(text) to anon, authenticated;

-- Called by a logged-in user landing on an invite link. Validates the
-- invite server-side and adds them to the business as a member.
create or replace function accept_invite(p_token text)
returns table (business_id uuid, business_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite invites%rowtype;
begin
  select * into v_invite from invites where token = p_token for update;

  if v_invite is null then
    raise exception 'This invite link is invalid.';
  end if;
  if v_invite.status <> 'pending' then
    raise exception 'This invite has already been used or revoked.';
  end if;
  if v_invite.expires_at < now() then
    raise exception 'This invite has expired.';
  end if;

  insert into business_members (business_id, user_id, role)
  values (v_invite.business_id, auth.uid(), 'member')
  on conflict (business_id, user_id) do nothing;

  update invites
    set status = 'accepted', accepted_by = auth.uid(), accepted_at = now()
    where id = v_invite.id;

  return query select b.id, b.name from businesses b where b.id = v_invite.business_id;
end;
$$;
grant execute on function accept_invite(text) to authenticated;

-- Lets any member see who else is on the business, including email
-- addresses — normally off-limits since auth.users isn't client-readable.
create or replace function list_team(p_business_id uuid)
returns table (user_id uuid, email text, role text, joined_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from business_members
    where business_id = p_business_id and user_id = auth.uid()
  ) then
    raise exception 'Not a member of this business.';
  end if;

  return query
    select bm.user_id, u.email::text, bm.role, bm.created_at
    from business_members bm
    join auth.users u on u.id = bm.user_id
    where bm.business_id = p_business_id
    order by bm.created_at asc;
end;
$$;
grant execute on function list_team(uuid) to authenticated;

-- ---------- Retail comparison photos ----------
-- Same item_media table now also holds photos of the retailer's listing
-- (for price comparison), separate from your own item photos.
alter table item_media drop constraint if exists item_media_type_check;
alter table item_media add constraint item_media_type_check
  check (type in ('photo', 'video', 'retail_photo'));

create or replace function check_item_media_limits()
returns trigger as $$
begin
  if new.type = 'photo' then
    if (select count(*) from item_media where item_id = new.item_id and type = 'photo') >= 10 then
      raise exception 'An item can have at most 10 photos';
    end if;
  elsif new.type = 'video' then
    if (select count(*) from item_media where item_id = new.item_id and type = 'video') >= 1 then
      raise exception 'An item can have at most 1 video';
    end if;
  elsif new.type = 'retail_photo' then
    if (select count(*) from item_media where item_id = new.item_id and type = 'retail_photo') >= 5 then
      raise exception 'An item can have at most 5 retail comparison photos';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;
