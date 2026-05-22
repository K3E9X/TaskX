
-- Enums
create type public.todo_status as enum ('todo','doing','done');
create type public.todo_priority as enum ('low','med','high','urgent');
create type public.routine_frequency as enum ('daily','weekly');

-- Todos
create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status public.todo_status not null default 'todo',
  priority public.todo_priority not null default 'med',
  due_at timestamptz,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.todos enable row level security;
create policy "todos_select_own" on public.todos for select to authenticated using (auth.uid() = user_id);
create policy "todos_insert_own" on public.todos for insert to authenticated with check (auth.uid() = user_id);
create policy "todos_update_own" on public.todos for update to authenticated using (auth.uid() = user_id);
create policy "todos_delete_own" on public.todos for delete to authenticated using (auth.uid() = user_id);
create trigger todos_set_updated_at before update on public.todos for each row execute function public.set_updated_at();
create index todos_user_status_idx on public.todos(user_id, status);
create index todos_user_due_idx on public.todos(user_id, due_at);

-- Notes
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled',
  content text not null default '',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.notes enable row level security;
create policy "notes_select_own" on public.notes for select to authenticated using (auth.uid() = user_id);
create policy "notes_insert_own" on public.notes for insert to authenticated with check (auth.uid() = user_id);
create policy "notes_update_own" on public.notes for update to authenticated using (auth.uid() = user_id);
create policy "notes_delete_own" on public.notes for delete to authenticated using (auth.uid() = user_id);
create trigger notes_set_updated_at before update on public.notes for each row execute function public.set_updated_at();
create index notes_user_updated_idx on public.notes(user_id, updated_at desc);

-- Routines
create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  steps jsonb not null default '[]'::jsonb,
  frequency public.routine_frequency not null default 'daily',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.routines enable row level security;
create policy "routines_select_own" on public.routines for select to authenticated using (auth.uid() = user_id);
create policy "routines_insert_own" on public.routines for insert to authenticated with check (auth.uid() = user_id);
create policy "routines_update_own" on public.routines for update to authenticated using (auth.uid() = user_id);
create policy "routines_delete_own" on public.routines for delete to authenticated using (auth.uid() = user_id);
create trigger routines_set_updated_at before update on public.routines for each row execute function public.set_updated_at();

-- Routine runs
create table public.routine_runs (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  run_date date not null default current_date,
  completed_steps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (routine_id, run_date)
);
alter table public.routine_runs enable row level security;
create policy "routine_runs_select_own" on public.routine_runs for select to authenticated using (auth.uid() = user_id);
create policy "routine_runs_insert_own" on public.routine_runs for insert to authenticated with check (auth.uid() = user_id);
create policy "routine_runs_update_own" on public.routine_runs for update to authenticated using (auth.uid() = user_id);
create policy "routine_runs_delete_own" on public.routine_runs for delete to authenticated using (auth.uid() = user_id);
create trigger routine_runs_set_updated_at before update on public.routine_runs for each row execute function public.set_updated_at();
create index routine_runs_user_date_idx on public.routine_runs(user_id, run_date desc);
