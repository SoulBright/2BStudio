-- Фикс: удаление задачи/объекта не должно падать на защите истории.
-- Прямой DELETE/UPDATE истории с клиента по-прежнему запрещён.

create or replace function public.allow_history_on_task_delete()
returns trigger
language plpgsql
as $$
begin
  perform set_config('app.allow_history_write', 'on', true);
  return old;
end;
$$;

drop trigger if exists tasks_before_delete_allow_history on public.tasks;
create trigger tasks_before_delete_allow_history
  before delete on public.tasks
  for each row execute function public.allow_history_on_task_delete();
