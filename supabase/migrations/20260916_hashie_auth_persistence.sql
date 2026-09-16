-- Hashie authentication persistence.
-- The backend is the only application data path. Client roles receive no table
-- or function privileges; RLS remains enabled as defense in depth.

create table public.hashie_guest_sessions (
  id uuid primary key,
  token_hash text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  upgraded_to_clerk_user_id text,
  upgrade_idempotency_key_hash text,
  constraint hashie_guest_sessions_token_hash_format
    check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint hashie_guest_sessions_upgrade_hash_format
    check (upgrade_idempotency_key_hash is null or upgrade_idempotency_key_hash ~ '^[0-9a-f]{64}$'),
  constraint hashie_guest_sessions_expiry_after_creation
    check (expires_at > created_at),
  constraint hashie_guest_sessions_upgrade_state
    check (
      (revoked_at is null and upgraded_to_clerk_user_id is null and upgrade_idempotency_key_hash is null)
      or
      (revoked_at is not null and upgraded_to_clerk_user_id is not null and upgrade_idempotency_key_hash is not null)
    )
);

create index hashie_guest_sessions_active_expiry_idx
  on public.hashie_guest_sessions (expires_at)
  where revoked_at is null;

create index hashie_guest_sessions_upgrade_target_idx
  on public.hashie_guest_sessions (upgraded_to_clerk_user_id)
  where upgraded_to_clerk_user_id is not null;

create table public.hashie_preferences (
  owner_type text not null,
  owner_id text not null,
  language text,
  nickname text,
  age_group text,
  accessibility_preferences text[] not null default '{}'::text[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (owner_type, owner_id),
  constraint hashie_preferences_owner_type_check
    check (owner_type in ('guest', 'clerk-user')),
  constraint hashie_preferences_owner_id_check
    check (owner_id = btrim(owner_id) and char_length(owner_id) between 1 and 255),
  constraint hashie_preferences_language_check
    check (language is null or language in ('english', 'akan-twi')),
  constraint hashie_preferences_nickname_check
    check (nickname is null or (nickname = btrim(nickname) and char_length(nickname) between 2 and 24)),
  constraint hashie_preferences_age_group_check
    check (age_group is null or age_group in ('under-13', '13-15', '16-17', '18-24', '25-plus', 'prefer-not-to-say')),
  constraint hashie_preferences_accessibility_check
    check (
      cardinality(accessibility_preferences) <= 7
      and array_position(accessibility_preferences, null) is null
      and accessibility_preferences <@ array[
        'larger-text', 'higher-contrast', 'captions', 'visual-details',
        'hearing-audio', 'no-changes', 'prefer-not-to-say'
      ]::text[]
    )
);

alter table public.hashie_guest_sessions enable row level security;
alter table public.hashie_guest_sessions force row level security;
alter table public.hashie_preferences enable row level security;
alter table public.hashie_preferences force row level security;

create policy hashie_guest_sessions_client_deny
  on public.hashie_guest_sessions
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy hashie_preferences_client_deny
  on public.hashie_preferences
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all privileges on table public.hashie_guest_sessions from public, anon, authenticated;
revoke all privileges on table public.hashie_preferences from public, anon, authenticated;
grant select, insert, update, delete on table public.hashie_guest_sessions to service_role;
grant select, insert, update, delete on table public.hashie_preferences to service_role;

create or replace function public.hashie_upgrade_guest_session(
  p_session_id uuid,
  p_clerk_user_id text,
  p_idempotency_key_hash text,
  p_consent boolean,
  p_now timestamptz default timezone('utc', now())
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  session_row public.hashie_guest_sessions%rowtype;
  guest_preferences public.hashie_preferences%rowtype;
  clerk_preferences public.hashie_preferences%rowtype;
  guest_exists boolean;
  clerk_exists boolean;
  merged_accessibility text[];
begin
  if p_consent is not true then
    return jsonb_build_object('status', 'invalid_consent');
  end if;

  if p_session_id is null
    or p_clerk_user_id is null
    or btrim(p_clerk_user_id) = ''
    or p_idempotency_key_hash is null
    or p_idempotency_key_hash !~ '^[0-9a-f]{64}$'
  then
    return jsonb_build_object('status', 'invalid_input');
  end if;

  select *
    into session_row
    from public.hashie_guest_sessions
   where id = p_session_id
   for update;

  if not found then
    return jsonb_build_object('status', 'inactive');
  end if;

  if session_row.revoked_at is not null then
    if session_row.upgraded_to_clerk_user_id = p_clerk_user_id
      and session_row.upgrade_idempotency_key_hash = p_idempotency_key_hash
    then
      return jsonb_build_object(
        'status', 'ok',
        'already_upgraded', true,
        'migrated_preferences', false
      );
    end if;
    return jsonb_build_object('status', 'conflict');
  end if;

  if session_row.expires_at <= p_now then
    return jsonb_build_object('status', 'inactive');
  end if;

  select *
    into guest_preferences
    from public.hashie_preferences
   where owner_type = 'guest'
     and owner_id = session_row.id::text
   for update;
  guest_exists := found;

  select *
    into clerk_preferences
    from public.hashie_preferences
   where owner_type = 'clerk-user'
     and owner_id = p_clerk_user_id
   for update;
  clerk_exists := found;

  if guest_exists then
    if clerk_exists then
      select coalesce(array_agg(value order by first_position), '{}'::text[])
        into merged_accessibility
        from (
          select value, min(position) as first_position
            from unnest(
              clerk_preferences.accessibility_preferences
              || guest_preferences.accessibility_preferences
            ) with ordinality as values(value, position)
           group by value
        ) as deduplicated;

      update public.hashie_preferences
         set language = coalesce(clerk_preferences.language, guest_preferences.language),
             nickname = coalesce(clerk_preferences.nickname, guest_preferences.nickname),
             age_group = coalesce(clerk_preferences.age_group, guest_preferences.age_group),
             accessibility_preferences = merged_accessibility,
             updated_at = p_now
       where owner_type = 'clerk-user'
         and owner_id = p_clerk_user_id;
    else
      insert into public.hashie_preferences (
        owner_type,
        owner_id,
        language,
        nickname,
        age_group,
        accessibility_preferences,
        created_at,
        updated_at
      ) values (
        'clerk-user',
        p_clerk_user_id,
        guest_preferences.language,
        guest_preferences.nickname,
        guest_preferences.age_group,
        guest_preferences.accessibility_preferences,
        p_now,
        p_now
      );
    end if;

    delete from public.hashie_preferences
     where owner_type = 'guest'
       and owner_id = session_row.id::text;
  end if;

  update public.hashie_guest_sessions
     set revoked_at = p_now,
         upgraded_to_clerk_user_id = p_clerk_user_id,
         upgrade_idempotency_key_hash = p_idempotency_key_hash
   where id = p_session_id;

  return jsonb_build_object(
    'status', 'ok',
    'already_upgraded', false,
    'migrated_preferences', guest_exists
  );
end;
$$;

revoke all privileges on function public.hashie_upgrade_guest_session(uuid, text, text, boolean, timestamptz) from public, anon, authenticated;
grant execute on function public.hashie_upgrade_guest_session(uuid, text, text, boolean, timestamptz) to service_role;
