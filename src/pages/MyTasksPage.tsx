import { useAuth } from '../contexts/AuthContext'

export function MyTasksPage() {
  const { isManager } = useAuth()

  return (
    <section className="panel">
      <h1>{isManager ? 'Все задачи' : 'Мои задачи'}</h1>
      <p className="muted">Блок 4 — список задач.</p>
    </section>
  )
}
