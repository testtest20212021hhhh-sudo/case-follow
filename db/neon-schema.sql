-- ============================================================================
--  Neon / plain PostgreSQL schema  (no Supabase-specific objects)
--  與 src/db/schema.ts 完全對應。所有資料（含 PDF／相片附件，以 Base64 存放）
--  只存放在 Neon 這個 PostgreSQL 資料庫，不需要任何外部儲存服務。
--  用法：Neon Console → SQL Editor → 整段貼上 → Run。可安全重複執行。
-- ============================================================================

-- 1. Enums -------------------------------------------------------------------
do $$ begin
  create type case_status as enum (
    'submitted', 'processing', 'replied_pending_user', 'appealing', 'closed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type action_required_by as enum ('gov', 'user', 'none');
exception when duplicate_object then null; end $$;

do $$ begin
  create type timeline_event_type as enum (
    'email_in', 'email_out', 'site_visit', 'internal_note'
  );
exception when duplicate_object then null; end $$;

-- 2. cases -------------------------------------------------------------------
create table if not exists cases (
  id                  uuid primary key default gen_random_uuid(),
  gov_ref_number      varchar(50),
  department          varchar(50) not null,
  title               varchar(255) not null,
  location            varchar(255),
  status              case_status not null default 'submitted',
  action_required_by  action_required_by not null default 'gov',
  submission_date     date not null,
  expected_reply_date date,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists cases_department_idx on cases (department);
create index if not exists cases_action_required_by_idx on cases (action_required_by);

-- 3. timeline_events ---------------------------------------------------------
create table if not exists timeline_events (
  id              uuid primary key default gen_random_uuid(),
  case_id         uuid not null references cases (id) on delete cascade,
  event_date      timestamptz not null,
  event_type      timeline_event_type not null,
  description        text not null,
  full_content       text,
  -- 附件以 Base64 文字存入 Neon（無需任何外部儲存服務）
  -- 結構：[{"name":"政府回函.pdf","mimeType":"application/pdf","sizeBytes":12345,"data":"<Base64>"}]
  attachments_base64 jsonb not null default '[]'::jsonb,
  created_at         timestamptz not null default now()
);

create index if not exists timeline_events_case_id_idx on timeline_events (case_id);
create index if not exists timeline_events_event_date_idx on timeline_events (event_date desc);

-- 4. updated_at trigger ------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists cases_set_updated_at on cases;
create trigger cases_set_updated_at
before update on cases
for each row execute function set_updated_at();
