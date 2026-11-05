-- Сид ПОСЛЕ миграций и создания пользователей в Authentication → Users.
-- Выполнять в SQL Editor. Подставьте email'ы своих тестовых пользователей.

update public.profiles
set role = 'manager', full_name = 'Постановщик Иван'
where email = 'manager@example.com';

update public.profiles
set role = 'executor', full_name = 'Исполнитель Анна'
where email = 'executor1@example.com';

update public.profiles
set role = 'executor', full_name = 'Исполнитель Олег'
where email = 'executor2@example.com';

do $$
declare
  v_manager uuid;
  v_exec1 uuid;
  v_exec2 uuid;
  v_obj1 uuid;
  v_obj2 uuid;
  v_obj3 uuid;
  v_task uuid;
begin
  select id into v_manager from public.profiles where email = 'manager@example.com';
  select id into v_exec1 from public.profiles where email = 'executor1@example.com';
  select id into v_exec2 from public.profiles where email = 'executor2@example.com';

  if v_manager is null or v_exec1 is null or v_exec2 is null then
    raise exception 'Сначала создайте пользователей в Auth и поправьте email в seed.sql';
  end if;

  insert into public.objects (name, address, created_by)
  values ('ЖК Север', 'ул. Ленина, 10', v_manager)
  returning id into v_obj1;

  insert into public.objects (name, address, created_by)
  values ('Склад Юг', 'пр. Мира, 5', v_manager)
  returning id into v_obj2;

  insert into public.objects (name, address, created_by)
  values ('Офис Центр', 'ул. Пушкина, 1', v_manager)
  returning id into v_obj3;

  -- Остаётся new
  insert into public.tasks (title, description, object_id, assignee_id, status, author_id)
  values ('Закупка бетона', 'Согласовать поставку на неделю', v_obj1, v_exec1, 'new', v_manager);

  -- new → in_progress
  insert into public.tasks (title, description, object_id, assignee_id, status, author_id)
  values ('Разметка участка', 'Вынести оси здания', v_obj1, v_exec1, 'new', v_manager)
  returning id into v_task;
  perform set_config('app.allow_status_change', 'on', true);
  perform set_config('app.allow_history_write', 'on', true);
  update public.tasks set status = 'in_progress' where id = v_task;
  insert into public.task_status_history (task_id, changed_by, from_status, to_status)
  values (v_task, v_exec1, 'new', 'in_progress');

  -- new → in_progress → in_review
  insert into public.tasks (title, description, object_id, assignee_id, status, author_id)
  values ('Отчёт по смете', 'Приложить файл расчёта', v_obj2, v_exec2, 'new', v_manager)
  returning id into v_task;
  perform set_config('app.allow_status_change', 'on', true);
  perform set_config('app.allow_history_write', 'on', true);
  update public.tasks set status = 'in_progress' where id = v_task;
  insert into public.task_status_history (task_id, changed_by, from_status, to_status)
  values (v_task, v_exec2, 'new', 'in_progress');
  update public.tasks set status = 'in_review' where id = v_task;
  insert into public.task_status_history (task_id, changed_by, from_status, to_status)
  values (v_task, v_exec2, 'in_progress', 'in_review');

  -- … → revision
  insert into public.tasks (title, description, object_id, assignee_id, status, author_id)
  values ('Проверка щитовой', 'Фото щита и подписи', v_obj2, v_exec2, 'new', v_manager)
  returning id into v_task;
  perform set_config('app.allow_status_change', 'on', true);
  perform set_config('app.allow_history_write', 'on', true);
  update public.tasks set status = 'in_progress' where id = v_task;
  insert into public.task_status_history (task_id, changed_by, from_status, to_status)
  values (v_task, v_exec2, 'new', 'in_progress');
  update public.tasks set status = 'in_review' where id = v_task;
  insert into public.task_status_history (task_id, changed_by, from_status, to_status)
  values (v_task, v_exec2, 'in_progress', 'in_review');
  update public.tasks set status = 'revision' where id = v_task;
  insert into public.task_status_history (task_id, changed_by, from_status, to_status, comment)
  values (v_task, v_manager, 'in_review', 'revision', 'Не хватает фото щита');

  -- … → accepted
  insert into public.tasks (title, description, object_id, assignee_id, status, author_id)
  values ('Уборка этажа', 'Сдать чистовую', v_obj3, v_exec1, 'new', v_manager)
  returning id into v_task;
  perform set_config('app.allow_status_change', 'on', true);
  perform set_config('app.allow_history_write', 'on', true);
  update public.tasks set status = 'in_progress' where id = v_task;
  insert into public.task_status_history (task_id, changed_by, from_status, to_status)
  values (v_task, v_exec1, 'new', 'in_progress');
  update public.tasks set status = 'in_review' where id = v_task;
  insert into public.task_status_history (task_id, changed_by, from_status, to_status)
  values (v_task, v_exec1, 'in_progress', 'in_review');
  update public.tasks set status = 'accepted' where id = v_task;
  insert into public.task_status_history (task_id, changed_by, from_status, to_status)
  values (v_task, v_manager, 'in_review', 'accepted');
end;
$$;
