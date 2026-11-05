import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types/database'

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export function LoginPage() {
  const { session, profile, loading, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return <div className="page-center">Загрузка…</div>
  }

  if (session && profile) {
    const home = profile.role === 'manager' ? '/objects' : '/my-tasks'
    return <Navigate to={home} replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await signIn(email.trim(), password)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Сессия не создана')
      }

      const nextProfile = await loadProfile(user.id)
      navigate(nextProfile?.role === 'manager' ? '/objects' : '/my-tasks', {
        replace: true,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <form className="panel login-form" onSubmit={handleSubmit}>
        <h1>Вход</h1>
        <p className="muted">Мини-CRM для объектов и задач</p>

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>Пароль</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error ? <p className="error">{error}</p> : null}

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Входим…' : 'Войти'}
        </button>
      </form>
    </div>
  )
}
