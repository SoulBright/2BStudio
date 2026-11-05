import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { ConstructionObject, Profile, Task } from '../types/database'

type TaskRow = Task & {
  objectName: string
  assigneeName?: string
}

export function MyTasksPage() {
  const { isManager } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [objects, setObjects] = useState<Record<string, ConstructionObject>>({})
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      const { data, error: queryError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (cancelled) return

      if (queryError) {
        setError(queryError.message)
        setTasks([])
        setLoading(false)
        return
      }

      const nextTasks = data ?? []
      setTasks(nextTasks)

      const objectIds = Array.from(new Set(nextTasks.map((task) => task.object_id)))
      const assigneeIds = Array.from(
        new Set(nextTasks.map((task) => task.assignee_id)),
      )

      const [objectsResult, profilesResult] = await Promise.all([
        objectIds.length
          ? supabase.from('objects').select('*').in('id', objectIds)
          : Promise.resolve({ data: [], error: null }),
        isManager && assigneeIds.length
          ? supabase.from('profiles').select('*').in('id', assigneeIds)
          : Promise.resolve({ data: [], error: null }),
      ])

      if (cancelled) return

      const objectMap: Record<string, ConstructionObject> = {}
      for (const row of objectsResult.data ?? []) {
        objectMap[row.id] = row
      }
      setObjects(objectMap)

      const profileMap: Record<string, Profile> = {}
      for (const row of profilesResult.data ?? []) {
        profileMap[row.id] = row
      }
      setProfiles(profileMap)

      setLoading(false)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [isManager])

  const rows: TaskRow[] = useMemo(
    () =>
      tasks.map((task) => {
        const assignee = profiles[task.assignee_id]
        return {
          ...task,
          objectName: objects[task.object_id]?.name ?? 'Объект',
          assigneeName: assignee
            ? assignee.full_name || assignee.email
            : undefined,
        }
      }),
    [tasks, objects, profiles],
  )

  return (
    <section className="panel">
      <div className="panel-header">
        <h1>{isManager ? 'Все задачи' : 'Мои задачи'}</h1>
      </div>

      {loading ? <p className="muted">Загрузка…</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {!loading && !error && rows.length === 0 ? (
        <p className="muted">Задач пока нет.</p>
      ) : null}

      {!loading && rows.length > 0 ? (
        <ul className="item-list">
          {rows.map((task) => (
            <li key={task.id}>
              <Link className="item-list__link" to={`/tasks/${task.id}`}>
                <div>
                  <div className="item-list__main">
                    <strong>{task.title}</strong>
                    <StatusBadge status={task.status} />
                  </div>
                  <div className="muted">
                    {task.objectName}
                    {isManager && task.assigneeName
                      ? ` · ${task.assigneeName}`
                      : ''}
                  </div>
                </div>
                <span className="item-list__chevron" aria-hidden>
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
