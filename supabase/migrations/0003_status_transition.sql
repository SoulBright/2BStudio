-- Смена статуса только через эту функцию. История пишется здесь же.

create or replace function public.transition_task_status(
  p_task_id uuid,
  p_new_status public.task_status,
  p_comment text default null
)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks;
  v_from public.task_status;
  v_uid uuid := auth.uid();
  v_is_manager boolean;
  v_comment text := nullif(trim(coalesce(p_comment, '')), '');
begin
  if v_uid is null then
    raise exception 'Нужна авторизация';
  end if;

  v_is_manager := public.is_manager();

  select * into v_task
  from public.tasks
  where id = p_task_id
    and (
      v_is_manager
      or assignee_id = v_uid
    )
  for update;

  if not found then
    raise exception 'Задача не найдена или нет доступа';
  end if;

  v_from := v_task.status;

  -- Разрешённые переходы
  if v_from = 'new' and p_new_status = 'in_progress' then
    if v_task.assignee_id is distinct from v_uid then
      raise exception 'В работу может взять только назначенный исполнитель';
    end if;

  elsif v_from = 'in_progress' and p_new_status = 'in_review' then
    if v_task.assignee_id is distinct from v_uid then
      raise exception 'На проверку может отправить только назначенный исполнитель';
    end if;

  elsif v_from = 'in_review' and p_new_status = 'accepted' then
    if not v_is_manager then
      raise exception 'Принять задачу может только постановщик';
    end if;

  elsif v_from = 'in_review' and p_new_status = 'revision' then
    if not v_is_manager then
      raise exception 'Вернуть на доработку может только постановщик';
    end if;
    if v_comment is null then
      raise exception 'При возврате на доработку комментарий обязателен';
    end if;

  elsif v_from = 'revision' and p_new_status = 'in_progress' then
    if v_task.assignee_id is distinct from v_uid then
      raise exception 'Снова взять в работу может только назначенный исполнитель';
    end if;

  else
    raise exception 'Переход % → % запрещён', v_from, p_new_status;
  end if;

  perform set_config('app.allow_status_change', 'on', true);
  perform set_config('app.allow_history_write', 'on', true);

  update public.tasks
  set status = p_new_status
  where id = p_task_id
  returning * into v_task;

  insert into public.task_status_history (
    task_id, changed_by, from_status, to_status, comment
  ) values (
    p_task_id, v_uid, v_from, p_new_status, v_comment
  );

  return v_task;
end;
$$;

revoke all on function public.transition_task_status(uuid, public.task_status, text) from public;
grant execute on function public.transition_task_status(uuid, public.task_status, text) to authenticated;

-- Клиент не может вставлять «левую» историю напрямую
revoke insert, update, delete on table public.task_status_history from authenticated;
revoke insert, update, delete on table public.task_status_history from anon;
