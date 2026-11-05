import { useState, type FormEvent } from 'react'
import type { ConstructionObject } from '../types/database'

type ObjectFormValues = {
  name: string
  address: string
}

type ObjectFormProps = {
  initial?: Pick<ConstructionObject, 'name' | 'address'>
  submitLabel: string
  onSubmit: (values: ObjectFormValues) => Promise<void>
  onCancel?: () => void
}

export function ObjectForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: ObjectFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)

    try {
      await onSubmit({
        name: name.trim(),
        address: address.trim(),
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
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={busy}
        />
      </label>

      <label className="field">
        <span>Адрес</span>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
          disabled={busy}
        />
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
