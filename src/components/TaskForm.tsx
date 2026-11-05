import { useState, type FormEvent } from 'react'
import type { Profile } from '../types/database'

type TaskFormValues = {
  title: string
  description: string
  assignee_id: string
}

type TaskFormProps = {
  executors: Profile[]
  initial?: {
    title: string
    description: string
    assignee_id: string
  }
  submitLabel: string
  onSubmit: (values: TaskFormValues) => Promise<void>
  onCancel?: () => void
}

export function TaskForm({
  executors,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: TaskFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [assigneeId, setAssigneeId] = useState(
    initial?.assignee_id ?? executors[0]?.id ?? '',
  )
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!assigneeId) {
      setError('Выберите исполнителя')
      return
    }

    setBusy(true)

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        assignee_id: assigneeId,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="stack-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>Название</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={busy}
        />
      </label>

      <label className="field">
        <span>Описание</span>
        <textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={busy}
        />
      </label>

      <label className="field">
        <span>Исполнитель</span>
        <select
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          required
          disabled={busy || executors.length === 0}
        >
          {executors.length === 0 ? (
            <option value="">Нет исполнителей</option>
          ) : (
            executors.map((executor) => (
              <option key={executor.id} value={executor.id}>
                {executor.full_name || executor.email}
              </option>
            ))
          )}
        </select>
      </label>

      {error ? <p className="error">{error}</p> : null}

      <div className="btn-row">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Сохраняем…' : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            onClick={onCancel}
          >
            Отмена
          </button>
        ) : null}
      </div>
    </form>
  )
}
