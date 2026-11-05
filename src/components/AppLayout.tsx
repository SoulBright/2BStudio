import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { roleLabel } from '../utils/labels'

export function AppLayout() {
  const { profile, isManager, signOut } = useAuth()

  const displayName = profile?.full_name || profile?.email || 'Пользователь'
  const role = profile ? roleLabel[profile.role] : ''

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__brand">Мини-CRM</div>

        <nav className="app-nav">
          <NavLink to="/objects">Объекты</NavLink>
          <NavLink to="/my-tasks">
            {isManager ? 'Все задачи' : 'Мои задачи'}
          </NavLink>
        </nav>

        <div className="app-header__user">
          <div className="app-header__meta">
            <strong>{displayName}</strong>
            <span>{role}</span>
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => void signOut()}>
            Выйти
          </button>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
