import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { ConstructionObject } from '../types/database'

export function ObjectsPage() {
  const [objects, setObjects] = useState<ConstructionObject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      const { data, error: queryError } = await supabase
        .from('objects')
        .select('*')
        .order('created_at', { ascending: true })

      if (cancelled) return

      if (queryError) {
        setError(queryError.message)
        setObjects([])
      } else {
        setObjects(data ?? [])
      }

      setLoading(false)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="panel">
      <div className="panel-header">
        <h1>Объекты</h1>
      </div>

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
