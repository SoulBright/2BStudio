-- Схема мини-CRM: профили, объекты, задачи, история статусов

create extension if not exists pgcrypto;

create type public.user_role as enum ('manager', 'executor');

create type public.task_status as enum (
  'new',
  'in_progress',
  'in_review',
  'accepted',
  'revision'
);

-- Профиль = auth.users + роль
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role public.user_role not null default 'executor',
  created_at timestamptz not null default now()
);

create table public.objects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  address text not null check (char_length(trim(address)) > 0),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) > 0),
  description text not null default '',
  object_id uuid not null references public.objects (id) on delete cascade,
  assignee_id uuid not null references public.profiles (id),
  status public.task_status not null default 'new',
  author_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.task_status_history (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  changed_by uuid not null references public.profiles (id),
  from_status public.task_status,
  to_status public.task_status not null,
  comment text,
  created_at timestamptz not null default now()
);

create index tasks_object_id_idx on public.tasks (object_id);
create index tasks_assignee_id_idx on public.tasks (assignee_id);
create index tasks_status_idx on public.tasks (status);
create index task_status_history_task_id_idx on public.task_status_history (task_id);

-- Вспомогательные функции для RLS и проверок
create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'manager'
  );
$$;

create or replace function public.is_executor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'executor'
  );
$$;

-- При создании пользователя в Auth появляется профиль (роль по умолчанию — исполнитель)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'executor'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Запись в историю при создании задачи
create or replace function public.log_task_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.task_status_history (
    task_id, changed_by, from_status, to_status, comment
  ) values (
    new.id, new.author_id, null, new.status, 'Задача создана'
  );
  return new;
end;
$$;

create trigger tasks_after_insert_history
  after insert on public.tasks
  for each row execute function public.log_task_created();

-- Исполнитель должен иметь роль executor; автор и статус при insert фиксируются
create or replace function public.enforce_task_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = new.assignee_id and role = 'executor'
  ) then
    raise exception 'Исполнителем можно назначить только пользователя с ролью executor';
  end if;

  -- Из клиента автор и статус фиксируются; из SQL Editor (сид) можно задать явно
  if auth.uid() is not null then
    new.author_id := auth.uid();
    new.status := 'new';
  end if;

  return new;
end;
$$;

create trigger tasks_before_insert
  before insert on public.tasks
  for each row execute function public.enforce_task_insert();

-- Прямая смена статуса через UPDATE запрещена (только через transition_task_status)
create or replace function public.guard_task_update()
returns trigger
language plpgsql
as $$
begin
  if old.status is distinct from new.status then
    if current_setting('app.allow_status_change', true) is distinct from 'on' then
      raise exception 'Статус меняется только через transition_task_status';
    end if;
  end if;

  if old.author_id is distinct from new.author_id then
    raise exception 'Автора задачи менять нельзя';
  end if;

  if old.created_at is distinct from new.created_at then
    raise exception 'Дату создания менять нельзя';
  end if;

  if new.assignee_id is distinct from old.assignee_id then
    if not exists (
      select 1 from public.profiles
      where id = new.assignee_id and role = 'executor'
    ) then
      raise exception 'Исполнителем можно назначить только пользователя с ролью executor';
    end if;
  end if;

  return new;
end;
$$;

create trigger tasks_before_update_guard
  before update on public.tasks
  for each row execute function public.guard_task_update();

-- История неизменяема с клиента
create or replace function public.forbid_history_mutation()
returns trigger
language plpgsql
as $$
begin
  if current_setting('app.allow_history_write', true) is distinct from 'on' then
    raise exception 'Историю статусов нельзя изменять или удалять';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger task_status_history_guard
  before update or delete on public.task_status_history
  for each row execute function public.forbid_history_mutation();

-- Создание объекта: created_by = текущий пользователь
create or replace function public.enforce_object_insert()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger objects_before_insert
  before insert on public.objects
  for each row execute function public.enforce_object_insert();

grant usage on type public.user_role to authenticated;
grant usage on type public.task_status to authenticated;

grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.objects to authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;
grant select on table public.task_status_history to authenticated;
