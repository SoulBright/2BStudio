import { useParams } from 'react-router-dom'

export function TaskPage() {
  const { id } = useParams()

  return (
    <section className="panel">
      <h1>Задача</h1>
      <p className="muted">Блок 3 — карточка задачи. id: {id}</p>
    </section>
  )
}
