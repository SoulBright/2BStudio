import { useState } from 'react'
import type { TaskStatus } from '../types/database'
import { getAvailableActions } from '../utils/status'

type TaskActionsProps = {
  status: TaskStatus
  isManager: boolean
  userId: string
  assigneeId: string
  busy: boolean
  onTransition: (to: TaskStatus, comment: string | null) => Promise<void>
}

export function TaskActions({
  status,
  isManager,
  userId,
  assigneeId,
  busy,
  onTransition,
}: TaskActionsProps) {
  const actions = getAvailableActions(status, { isManager, userId, assigneeId })
  const [comment, setComment] = useState('')
  const [pendingTo, setPendingTo] = useState<TaskStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (actions.length === 0) {
    return <p className="muted">Доступных действий нет.</p>
  }

  async function runAction(to: TaskStatus, requiresComment: boolean) {
    setError(null)

    if (requiresComment && !comment.trim()) {
      setError('Для возврата на доработку нужен комментарий')
      setPendingTo(to)
      return
    }

    setPendingTo(to)
    try {
      await onTransition(to, requiresComment ? comment.trim() : null)
      setComment('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сменить статус')
    } finally {
      setPendingTo(null)
    }
  }

  const needsCommentBox = actions.some((action) => action.requiresComment)

  return (
    <div className="task-actions">
      {needsCommentBox ? (
        <label className="field">
          <span>Комментарий (обязателен при возврате на доработку)</span>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={busy}
          />
        </label>
      ) : null}

      {error ? <p className="error">{error}</p> : null}

      <div className="btn-row">
        {actions.map((action) => (
          <button
            key={action.to}
            type="button"
            className={
              action.requiresComment ? 'btn btn-danger' : 'btn btn-primary'
            }
            disabled={busy || pendingTo !== null}
            onClick={() => void runAction(action.to, action.requiresComment)}
          >
            {pendingTo === action.to ? 'Сохраняем…' : action.label}
          </button>
        ))}
      </div>
    </div>
  )
}
