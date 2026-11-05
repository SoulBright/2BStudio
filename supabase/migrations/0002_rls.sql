-- Row Level Security: постановщик видит всё, исполнитель — только своё

alter table public.profiles enable row level security;
alter table public.objects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_status_history enable row level security;

-- Профили
create policy profiles_select_own_or_manager
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or public.is_manager()
    -- имена исполнителей нужны постановщику и для отображения в задачах
    or public.is_executor()
  );

create policy profiles_update_self_name
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );

create policy profiles_update_role_manager
  on public.profiles for update to authenticated
  using (public.is_manager())
  with check (public.is_manager());

-- Объекты
create policy objects_select
  on public.objects for select to authenticated
  using (
    public.is_manager()
    or exists (
      select 1 from public.tasks t
      where t.object_id = objects.id
        and t.assignee_id = auth.uid()
    )
  );

create policy objects_insert_manager
  on public.objects for insert to authenticated
  with check (public.is_manager());

create policy objects_update_manager
  on public.objects for update to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy objects_delete_manager
  on public.objects for delete to authenticated
  using (public.is_manager());

-- Задачи
create policy tasks_select
  on public.tasks for select to authenticated
  using (
    public.is_manager()
    or assignee_id = auth.uid()
  );

create policy tasks_insert_manager
  on public.tasks for insert to authenticated
  with check (public.is_manager());

create policy tasks_update_manager
  on public.tasks for update to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy tasks_delete_manager
  on public.tasks for delete to authenticated
  using (public.is_manager());

-- История: только чтение по видимым задачам. Insert/update/delete с клиента закрыты (нет grant + триггер)
create policy task_status_history_select
  on public.task_status_history for select to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_status_history.task_id
        and (
          public.is_manager()
          or t.assignee_id = auth.uid()
        )
    )
  );
