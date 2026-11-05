import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import { supabase } from '../lib/supabase'
import type { ConstructionObject, Task } from '../types/database'

export function ObjectPage() {
  const { id } = useParams<{ id: string }>()
  const [object, setObject] = useState<ConstructionObject | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      const [objectResult, tasksResult] = await Promise.all([
        supabase.from('objects').select('*').eq('id', id!).maybeSingle(),
        supabase
          .from('tasks')
          .select('*')
          .eq('object_id', id!)
          .order('created_at', { ascending: true }),
      ])

      if (cancelled) return

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
      setLoading(false)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <section className="panel">
        <p className="muted">Загрузка…</p>
      </section>
    )
  }

  if (error || !object) {
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
        <h1>{object.name}</h1>
        <p className="muted">{object.address}</p>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Задачи</h2>
        </div>

        {tasks.length === 0 ? (
          <p className="muted">По этому объекту задач нет (или нет доступа к ним).</p>
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
