
-- Projects
create type public.project_status as enum ('draft', 'active', 'on_hold', 'done');
create type public.risk_level as enum ('low', 'medium', 'high', 'critical');

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  description text,
  status public.project_status not null default 'draft',
  risk_level public.risk_level not null default 'medium',
  data_classification text,
  compliance text[] not null default '{}',
  security_controls text,
  threat_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;
create policy projects_select_own on public.projects for select to authenticated using (auth.uid() = user_id);
create policy projects_insert_own on public.projects for insert to authenticated with check (auth.uid() = user_id);
create policy projects_update_own on public.projects for update to authenticated using (auth.uid() = user_id);
create policy projects_delete_own on public.projects for delete to authenticated using (auth.uid() = user_id);

create trigger projects_set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

-- Meetings
create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  meeting_date timestamptz not null default now(),
  attendees text[] not null default '{}',
  agenda text,
  notes text not null default '',
  decisions text,
  action_items text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.meetings enable row level security;
create policy meetings_select_own on public.meetings for select to authenticated using (auth.uid() = user_id);
create policy meetings_insert_own on public.meetings for insert to authenticated with check (auth.uid() = user_id);
create policy meetings_update_own on public.meetings for update to authenticated using (auth.uid() = user_id);
create policy meetings_delete_own on public.meetings for delete to authenticated using (auth.uid() = user_id);

create trigger meetings_set_updated_at before update on public.meetings
  for each row execute function public.set_updated_at();

-- Diagrams
create type public.diagram_type as enum ('flowchart', 'sequence', 'erd', 'architecture', 'state', 'other');

create table public.diagrams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  diagram_type public.diagram_type not null default 'flowchart',
  source text not null default 'graph TD\n  A[Start] --> B[End]',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.diagrams enable row level security;
create policy diagrams_select_own on public.diagrams for select to authenticated using (auth.uid() = user_id);
create policy diagrams_insert_own on public.diagrams for insert to authenticated with check (auth.uid() = user_id);
create policy diagrams_update_own on public.diagrams for update to authenticated using (auth.uid() = user_id);
create policy diagrams_delete_own on public.diagrams for delete to authenticated using (auth.uid() = user_id);

create trigger diagrams_set_updated_at before update on public.diagrams
  for each row execute function public.set_updated_at();
