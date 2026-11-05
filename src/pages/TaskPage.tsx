import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import { TaskActions } from '../components/TaskActions'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type {
  ConstructionObject,
  Profile,
  Task,
  TaskStatus,
  TaskStatusHistory,
} from '../types/database'
import { formatStatusChange } from '../utils/status'

type HistoryRow = TaskStatusHistory & {
  actorName: string
}

function profileName(profile: Profile | undefined, fallbackId: string) {
  if (!profile) return fallbackId.slice(0, 8)
  return profile.full_name || profile.email
}

export function TaskPage() {
  const { id } = useParams<{ id: string }>()
  const { user, isManager } = useAuth()

  const [task, setTask] = useState<Task | null>(null)
  const [object, setObject] = useState<ConstructionObject | null>(null)
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [history, setHistory] = useState<TaskStatusHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return

    setLoading(true)
    setError(null)

    const [taskResult, historyResult] = await Promise.all([
      supabase.from('tasks').select('*').eq('id', id).maybeSingle(),
      supabase
        .from('task_status_history')
        .select('*')
        .eq('task_id', id)
        .order('created_at', { ascending: true }),
    ])

    if (taskResult.error) {
      setError(taskResult.error.message)
      setTask(null)
      setLoading(false)
      return
    }

    if (!taskResult.data) {
      setError('Задача не найдена или нет доступа')
      setTask(null)
      setLoading(false)
      return
    }

    const nextTask = taskResult.data
    setTask(nextTask)

    if (historyResult.error) {
      setError(historyResult.error.message)
      setHistory([])
    } else {
      setHistory(historyResult.data ?? [])
    }

    const objectResult = await supabase
      .from('objects')
      .select('*')
      .eq('id', nextTask.object_id)
      .maybeSingle()

    setObject(objectResult.data ?? null)

    const profileIds = Array.from(
      new Set([
        nextTask.assignee_id,
        nextTask.author_id,
        ...(historyResult.data ?? []).map((row) => row.changed_by),
      ]),
    )

    if (profileIds.length > 0) {
      const profilesResult = await supabase
        .from('profiles')
        .select('*')
        .in('id', profileIds)

      const map: Record<string, Profile> = {}
      for (const row of profilesResult.data ?? []) {
        map[row.id] = row
      }
      setProfiles(map)
    } else {
      setProfiles({})
    }

    setLoading(false)
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const historyRows: HistoryRow[] = useMemo(
    () =>
      history.map((row) => ({
        ...row,
        actorName: profileName(profiles[row.changed_by], row.changed_by),
      })),
    [history, profiles],
  )

  async function handleTransition(to: TaskStatus, comment: string | null) {
    if (!task) return

    setBusy(true)
    setError(null)

    const { error: rpcError } = await supabase.rpc('transition_task_status', {
      p_task_id: task.id,
      p_new_status: to,
      p_comment: comment,
    })

    setBusy(false)

    if (rpcError) {
      throw new Error(rpcError.message)
    }

    await load()
  }

  if (loading) {
    return (
      <section className="panel">
        <p className="muted">Загрузка…</p>
      </section>
    )
  }

  if (error && !task) {
    return (
      <section className="panel">
        <p className="error">{error}</p>
        <Link to="/objects">← К объектам</Link>
      </section>
    )
  }

  if (!task || !user) {
    return null
  }

  const backTo = object
    ? `/objects/${object.id}`
    : '/objects'

  return (
    <div className="stack">
      <section className="panel">
        <Link className="back-link" to={backTo}>
          ← {object ? object.name : 'К объектам'}
        </Link>

        <div className="panel-header">
          <h1>{task.title}</h1>
          <StatusBadge status={task.status} />
        </div>

        <p>{task.description || 'Без описания'}</p>

        <dl className="meta-list">
          <div>
            <dt>Объект</dt>
            <dd>
              {object ? (
                <Link to={`/objects/${object.id}`}>{object.name}</Link>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div>
            <dt>Исполнитель</dt>
            <dd>{profileName(profiles[task.assignee_id], task.assignee_id)}</dd>
          </div>
          <div>
            <dt>Автор</dt>
            <dd>{profileName(profiles[task.author_id], task.author_id)}</dd>
          </div>
          <div>
            <dt>Создана</dt>
            <dd>{new Date(task.created_at).toLocaleString('ru-RU')}</dd>
          </div>
        </dl>

        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="panel">
        <h2>Действия</h2>
        <TaskActions
          status={task.status}
          isManager={isManager}
          userId={user.id}
          assigneeId={task.assignee_id}
          busy={busy}
          onTransition={handleTransition}
        />
      </section>

      <section className="panel">
        <h2>История статусов</h2>
        {historyRows.length === 0 ? (
          <p className="muted">Записей пока нет.</p>
        ) : (
          <ul className="history-list">
            {historyRows.map((row) => (
              <li key={row.id}>
                <div className="history-list__title">
                  {formatStatusChange(row.from_status, row.to_status)}
                </div>
                <div className="muted">
                  {row.actorName} ·{' '}
                  {new Date(row.created_at).toLocaleString('ru-RU')}
                </div>
                {row.comment ? (
                  <div className="history-list__comment">{row.comment}</div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
