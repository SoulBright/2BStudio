import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function HomeRedirect() {
  const { session, profile, loading } = useAuth()

  if (loading || (session && !profile)) {
    return <div className="page-center">Загрузка…</div>
  }

  if (profile?.role === 'manager') {
    return <Navigate to="/objects" replace />
  }

  return <Navigate to="/my-tasks" replace />
}
