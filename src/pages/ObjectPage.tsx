import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ObjectForm } from '../components/ObjectForm'
import { StatusBadge } from '../components/StatusBadge'
import { TaskForm } from '../components/TaskForm'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { ConstructionObject, Profile, Task } from '../types/database'

export function ObjectPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isManager } = useAuth()

  const [object, setObject] = useState<ConstructionObject | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [executors, setExecutors] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [creatingTask, setCreatingTask] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!id) return

    setLoading(true)
    setError(null)

    const [objectResult, tasksResult] = await Promise.all([
      supabase.from('objects').select('*').eq('id', id).maybeSingle(),
      supabase
        .from('tasks')
        .select('*')
        .eq('object_id', id)
        .order('created_at', { ascending: true }),
    ])

    if (objectResult.error) {
      setError(objectResult.error.message)
      setObject(null)
      setTasks([])
      setLoading(false)
      return
    }

    if (!objectResult.data) {
      setError('Объект не найден или нет доступа')
      setObject(null)
      setTasks([])
      setLoading(false)
      return
    }

    if (tasksResult.error) {
      setError(tasksResult.error.message)
      setObject(objectResult.data)
      setTasks([])
      setLoading(false)
      return
    }

    setObject(objectResult.data)
    setTasks(tasksResult.data ?? [])

    if (isManager) {
      const { data: executorRows } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'executor')
        .order('full_name', { ascending: true })

      setExecutors(executorRows ?? [])
    }

    setLoading(false)
  }, [id, isManager])

  useEffect(() => {
    void load()
  }, [load])

  async function handleDeleteObject() {
    if (!object) return
    if (
      !window.confirm(
        `Удалить объект «${object.name}» вместе со всеми задачами?`,
      )
    ) {
      return
    }

    setBusy(true)
    const { error: deleteError } = await supabase
      .from('objects')
      .delete()
      .eq('id', object.id)
    setBusy(false)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    navigate('/objects')
  }

  if (loading) {
    return (
      <section className="panel">
        <p className="muted">Загрузка…</p>
      </section>
    )
  }

  if ((error && !object) || !object) {
    return (
      <section className="panel">
        <p className="error">{error ?? 'Объект не найден'}</p>
        <Link to="/objects">← К списку объектов</Link>
      </section>
    )
  }

  return (
    <div className="stack">
      <section className="panel">
        <Link className="back-link" to="/objects">
          ← К списку объектов
        </Link>

        {editing && isManager ? (
          <>
            <h1>Редактировать объект</h1>
            <ObjectForm
              initial={object}
              submitLabel="Сохранить"
              onSubmit={async (values) => {
                const { error: updateError } = await supabase
                  .from('objects')
                  .update({
                    name: values.name,
                    address: values.address,
                  })
                  .eq('id', object.id)

                if (updateError) {
                  throw new Error(updateError.message)
                }

                setEditing(false)
                await load()
              }}
              onCancel={() => setEditing(false)}
            />
          </>
        ) : (
          <>
            <div className="panel-header">
              <h1>{object.name}</h1>
              {isManager ? (
                <div className="btn-row">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setEditing(true)}
                  >
                    Изменить
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={busy}
                    onClick={() => void handleDeleteObject()}
                  >
                    Удалить
                  </button>
                </div>
              ) : null}
            </div>
            <p className="muted">{object.address}</p>
            {error ? <p className="error">{error}</p> : null}
          </>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Задачи</h2>
          {isManager ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setCreatingTask((value) => !value)}
            >
              {creatingTask ? 'Закрыть форму' : 'Новая задача'}
            </button>
          ) : null}
        </div>

        {creatingTask && isManager ? (
          <div className="nested-panel">
            <h3>Создать задачу</h3>
            <TaskForm
              executors={executors}
              submitLabel="Создать"
              onSubmit={async (values) => {
                const { error: insertError } = await supabase.from('tasks').insert({
                  title: values.title,
                  description: values.description,
                  object_id: object.id,
                  assignee_id: values.assignee_id,
                })

                if (insertError) {
                  throw new Error(insertError.message)
                }

                setCreatingTask(false)
                await load()
              }}
              onCancel={() => setCreatingTask(false)}
            />
          </div>
        ) : null}

        {tasks.length === 0 ? (
          <p className="muted">
            По этому объекту задач нет (или нет доступа к ним).
          </p>
        ) : (
          <ul className="item-list">
            {tasks.map((task) => (
              <li key={task.id}>
                <Link className="item-list__link" to={`/tasks/${task.id}`}>
                  <div className="item-list__main">
                    <strong>{task.title}</strong>
                    <StatusBadge status={task.status} />
                  </div>
                  <span className="item-list__chevron" aria-hidden>
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
