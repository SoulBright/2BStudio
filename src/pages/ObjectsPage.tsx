import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ObjectForm } from '../components/ObjectForm'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { ConstructionObject } from '../types/database'

export function ObjectsPage() {
  const { isManager } = useAuth()
  const [objects, setObjects] = useState<ConstructionObject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: queryError } = await supabase
      .from('objects')
      .select('*')
      .order('created_at', { ascending: true })

    if (queryError) {
      setError(queryError.message)
      setObjects([])
    } else {
      setObjects(data ?? [])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <section className="panel">
      <div className="panel-header">
        <h1>Объекты</h1>
        {isManager ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowCreate((value) => !value)}
          >
            {showCreate ? 'Закрыть форму' : 'Новый объект'}
          </button>
        ) : null}
      </div>

      {showCreate && isManager ? (
        <div className="nested-panel">
          <h2>Создать объект</h2>
          <ObjectForm
            submitLabel="Создать"
            onSubmit={async (values) => {
              const { error: insertError } = await supabase.from('objects').insert({
                name: values.name,
                address: values.address,
              })

              if (insertError) {
                throw new Error(insertError.message)
              }

              setShowCreate(false)
              await load()
            }}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      ) : null}

      {loading ? <p className="muted">Загрузка…</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {!loading && !error && objects.length === 0 ? (
        <p className="muted">Объектов пока нет.</p>
      ) : null}

      {!loading && objects.length > 0 ? (
        <ul className="item-list">
          {objects.map((object) => (
            <li key={object.id}>
              <Link className="item-list__link" to={`/objects/${object.id}`}>
                <div>
                  <strong>{object.name}</strong>
                  <div className="muted">{object.address}</div>
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
