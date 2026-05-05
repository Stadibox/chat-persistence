-- 0001_chat_schema.sql
-- Persistencia de chat: conversations + messages (append-only) + claude_jobs.
--
-- Convenciones:
--   - Nombres de TABLA quedan sin prefijo (conversations, messages, claude_jobs).
--   - TODAS las funciones, trigger functions y triggers van con prefijo `chat_`
--     para no chocar con funciones globales/compartidas pre-existentes
--     (p. ej. otro `set_updated_at` o `claim_pending_*` de otro dominio).
--
-- RLS: cada usuario sólo ve y muta lo suyo. El worker usa service_role (bypassa RLS).
-- Idempotente: re-ejecutable sin efectos colaterales.

-- =========================================================================
-- 1. Tablas
-- =========================================================================

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists conversations_user_updated_idx
  on public.conversations (user_id, updated_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  sequence integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_sequence_idx
  on public.messages (conversation_id, sequence asc);

-- Defensa contra races: dos inserts concurrentes que calculen el mismo
-- max(sequence)+1 colisionan aquí; el segundo falla con unique_violation
-- y el cliente puede reintentar.
create unique index if not exists messages_conversation_sequence_unique_idx
  on public.messages (conversation_id, sequence);

create table if not exists public.claude_jobs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_message_id uuid not null references public.messages(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed', 'cancelled')),
  worker_id text,
  locked_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists claude_jobs_status_created_idx
  on public.claude_jobs (status, created_at asc);
create index if not exists claude_jobs_conversation_idx
  on public.claude_jobs (conversation_id);

-- =========================================================================
-- 2. Trigger functions (prefijo chat_)
-- =========================================================================

-- Asigna `sequence` automáticamente si no se mandó (orden determinista por
-- conversación; evita races simples entre inserts concurrentes).
create or replace function public.chat_assign_message_sequence()
returns trigger language plpgsql as $$
begin
  if new.sequence is null then
    select coalesce(max(sequence), 0) + 1
      into new.sequence
      from public.messages
      where conversation_id = new.conversation_id;
  end if;
  return new;
end;
$$;

-- Toca conversations.updated_at en cada mensaje nuevo.
create or replace function public.chat_touch_conversation_on_message()
returns trigger language plpgsql as $$
begin
  update public.conversations
    set updated_at = now()
    where id = new.conversation_id;
  return new;
end;
$$;

-- Mantiene claude_jobs.updated_at en cada update.
create or replace function public.chat_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- =========================================================================
-- 3. Triggers (prefijo chat_, apuntan a las funciones de arriba)
-- =========================================================================

drop trigger if exists chat_messages_set_sequence on public.messages;
create trigger chat_messages_set_sequence
  before insert on public.messages
  for each row execute function public.chat_assign_message_sequence();

drop trigger if exists chat_messages_touch_conversation on public.messages;
create trigger chat_messages_touch_conversation
  after insert on public.messages
  for each row execute function public.chat_touch_conversation_on_message();

drop trigger if exists chat_claude_jobs_set_updated_at on public.claude_jobs;
create trigger chat_claude_jobs_set_updated_at
  before update on public.claude_jobs
  for each row execute function public.chat_set_updated_at();

-- =========================================================================
-- 4. RPCs atómicos (prefijo chat_)
-- =========================================================================

-- Inicia conversación + primer mensaje + job pendiente en una sola transacción.
create or replace function public.chat_start_conversation_with_message(p_content text)
returns json language plpgsql security invoker as $$
declare
  v_user_id uuid;
  v_conv public.conversations%rowtype;
  v_msg public.messages%rowtype;
  v_job public.claude_jobs%rowtype;
  v_title text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  v_title := substring(regexp_replace(trim(p_content), '\s+', ' ', 'g'), 1, 60);

  insert into public.conversations (user_id, title)
    values (v_user_id, v_title)
    returning * into v_conv;

  insert into public.messages (conversation_id, user_id, role, content)
    values (v_conv.id, v_user_id, 'user', p_content)
    returning * into v_msg;

  insert into public.claude_jobs (conversation_id, user_message_id, status)
    values (v_conv.id, v_msg.id, 'pending')
    returning * into v_job;

  return json_build_object(
    'conversation', row_to_json(v_conv),
    'message', row_to_json(v_msg),
    'job', row_to_json(v_job)
  );
end;
$$;

-- Inserta mensaje del usuario + job en una conversación existente.
create or replace function public.chat_send_message_in_conversation(
  p_conversation_id uuid,
  p_content text
)
returns json language plpgsql security invoker as $$
declare
  v_user_id uuid;
  v_msg public.messages%rowtype;
  v_job public.claude_jobs%rowtype;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from public.conversations
    where id = p_conversation_id and user_id = v_user_id
  ) then
    raise exception 'conversation not found';
  end if;

  insert into public.messages (conversation_id, user_id, role, content)
    values (p_conversation_id, v_user_id, 'user', p_content)
    returning * into v_msg;

  insert into public.claude_jobs (conversation_id, user_message_id, status)
    values (p_conversation_id, v_msg.id, 'pending')
    returning * into v_job;

  return json_build_object(
    'message', row_to_json(v_msg),
    'job', row_to_json(v_job)
  );
end;
$$;

grant execute on function public.chat_start_conversation_with_message(text) to authenticated;
grant execute on function public.chat_send_message_in_conversation(uuid, text) to authenticated;

-- Claim atómico de un job pendiente (FOR UPDATE SKIP LOCKED). Service-role only.
create or replace function public.chat_claim_pending_claude_job(p_worker_id text)
returns public.claude_jobs language plpgsql security definer as $$
declare
  claimed public.claude_jobs;
begin
  update public.claude_jobs
    set status = 'running',
        worker_id = p_worker_id,
        locked_at = now(),
        updated_at = now()
    where id = (
      select id from public.claude_jobs
        where status = 'pending'
        order by created_at asc
        limit 1
        for update skip locked
    )
    returning * into claimed;
  return claimed;
end;
$$;
revoke all on function public.chat_claim_pending_claude_job(text) from public, anon, authenticated;
grant execute on function public.chat_claim_pending_claude_job(text) to service_role;

-- =========================================================================
-- 5. RLS
-- =========================================================================

alter table public.conversations enable row level security;
alter table public.messages       enable row level security;
alter table public.claude_jobs    enable row level security;

drop policy if exists conversations_select_own on public.conversations;
drop policy if exists conversations_insert_own on public.conversations;
drop policy if exists conversations_update_own on public.conversations;
drop policy if exists conversations_delete_own on public.conversations;

create policy conversations_select_own on public.conversations
  for select using (user_id = auth.uid());
create policy conversations_insert_own on public.conversations
  for insert with check (user_id = auth.uid());
create policy conversations_update_own on public.conversations
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy conversations_delete_own on public.conversations
  for delete using (user_id = auth.uid());

drop policy if exists messages_select_own on public.messages;
drop policy if exists messages_insert_user_only on public.messages;

create policy messages_select_own on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
        where c.id = messages.conversation_id
          and c.user_id = auth.uid()
    )
  );
create policy messages_insert_user_only on public.messages
  for insert with check (
    role = 'user'
    and user_id = auth.uid()
    and exists (
      select 1 from public.conversations c
        where c.id = messages.conversation_id
          and c.user_id = auth.uid()
    )
  );

drop policy if exists claude_jobs_select_own on public.claude_jobs;
drop policy if exists claude_jobs_insert_pending on public.claude_jobs;

create policy claude_jobs_select_own on public.claude_jobs
  for select using (
    exists (
      select 1 from public.conversations c
        where c.id = claude_jobs.conversation_id
          and c.user_id = auth.uid()
    )
  );
create policy claude_jobs_insert_pending on public.claude_jobs
  for insert with check (
    status = 'pending'
    and exists (
      select 1
        from public.messages m
        join public.conversations c on c.id = m.conversation_id
        where m.id = claude_jobs.user_message_id
          and m.role = 'user'
          and c.user_id = auth.uid()
          and m.conversation_id = claude_jobs.conversation_id
    )
  );

-- =========================================================================
-- 6. Realtime (idempotente: ignora si ya está añadida)
-- =========================================================================

do $$
begin
  begin
    alter publication supabase_realtime add table public.messages;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.claude_jobs;
  exception when duplicate_object then null;
  end;
end$$;
