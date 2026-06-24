drop function if exists public.claim_spin_lock(text, jsonb);
drop function if exists public.claim_spin_lock(text);
drop function if exists public.get_spin_lock_status(text);

create table if not exists public.spin_devices (
  device_id text primary key,
  attempts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.spin_devices enable row level security;

revoke all on public.spin_devices from anon, authenticated;

create or replace function public.claim_spin_lock(
  p_device_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_attempts jsonb;
  last_attempt jsonb;
  next_attempts jsonb;
  segment_index integer;
  selected_segment jsonb;
  spin_id text;
  spun_at text;
  spin jsonb;
begin
  segment_index := floor(random() * 7)::integer;

  selected_segment := jsonb_build_object(
    'id',
    (array[1, 2, 3, 4, 5, 6, 7])[segment_index + 1],
    'label',
    (array['STICKER', 'NOTE PAD & PEN', 'TRY AGAIN', 'TOTE BAG', 'KEY HOLDER', 'OOPS! BETTER LUCK', 'TRY AGAIN'])[segment_index + 1],
    'type',
    (array['prize', 'prize', 'loss', 'prize', 'prize', 'loss', 'loss'])[segment_index + 1],
    'colorClass',
    (array['dark', 'light', 'dark', 'light', 'dark', 'light', 'dark'])[segment_index + 1],
    'imagename',
    (array['sticker.jpeg', 'notepadandpen.jpeg', 'tryagain.jpeg', 'totebag.jpeg', 'keyholder.jpeg', 'oops.jpeg', 'tryagain.jpeg'])[segment_index + 1]
  );

  spin_id := md5(random()::text || clock_timestamp()::text || p_device_id);
  spun_at := timezone('utc', now())::text;
  spin := jsonb_build_object(
    'id', spin_id,
    'result', selected_segment,
    'spunAt', spun_at
  );

  select attempts
  into current_attempts
  from public.spin_devices
  where device_id = p_device_id
  for update;

  if current_attempts is null then
    insert into public.spin_devices (device_id, attempts, updated_at)
    values (p_device_id, jsonb_build_array(spin), timezone('utc', now()));

    return jsonb_build_object(
      'statusCode', 201,
      'body', jsonb_build_object(
        'allowed', true,
        'hasSpun', true,
        'canSpin', coalesce(spin->'result'->>'label', '') = 'TRY AGAIN',
        'spin', jsonb_build_object(
          'id', spin->>'id',
          'result', spin->'result',
          'spunAt', spin->>'spunAt'
        )
      )
    );
  end if;

  last_attempt := current_attempts -> (jsonb_array_length(current_attempts) - 1);

  if coalesce(last_attempt->'result'->>'label', '') <> 'TRY AGAIN' then
    return jsonb_build_object(
      'statusCode', 409,
      'body', jsonb_build_object(
        'allowed', false,
        'hasSpun', true,
        'canSpin', false,
        'spin', jsonb_build_object(
          'id', last_attempt->>'id',
          'result', last_attempt->'result',
          'spunAt', last_attempt->>'spunAt'
        )
      )
    );
  end if;

  next_attempts := current_attempts || jsonb_build_array(spin);

  update public.spin_devices
  set attempts = next_attempts,
      updated_at = timezone('utc', now())
  where device_id = p_device_id;

  return jsonb_build_object(
    'statusCode', 201,
    'body', jsonb_build_object(
      'allowed', true,
      'hasSpun', true,
      'canSpin', coalesce(spin->'result'->>'label', '') = 'TRY AGAIN',
      'spin', jsonb_build_object(
        'id', spin->>'id',
        'result', spin->'result',
        'spunAt', spin->>'spunAt'
      )
    )
  );
end;
$$;

create or replace function public.get_spin_lock_status(
  p_device_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_attempts jsonb;
  last_attempt jsonb;
begin
  select attempts
  into current_attempts
  from public.spin_devices
  where device_id = p_device_id;

  if current_attempts is null then
    return jsonb_build_object(
      'statusCode', 200,
      'body', jsonb_build_object(
        'hasSpun', false,
        'canSpin', true,
        'spin', null
      )
    );
  end if;

  last_attempt := current_attempts -> (jsonb_array_length(current_attempts) - 1);

  return jsonb_build_object(
    'statusCode', 200,
    'body', jsonb_build_object(
      'hasSpun', true,
      'canSpin', coalesce(last_attempt->'result'->>'label', '') = 'TRY AGAIN',
      'spin', jsonb_build_object(
        'id', last_attempt->>'id',
        'result', last_attempt->'result',
        'spunAt', last_attempt->>'spunAt'
      )
    )
  );
end;
$$;

revoke all on function public.claim_spin_lock(text) from public;
revoke all on function public.get_spin_lock_status(text) from public;
grant execute on function public.claim_spin_lock(text) to anon, authenticated;
grant execute on function public.get_spin_lock_status(text) to anon, authenticated;
