import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types/database'

type AuthContextValue = {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  isManager: boolean
  isExecutor: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchProfile(userId: string): Promise<Profile | null> {
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string) => {
    const nextProfile = await fetchProfile(userId)
    setProfile(nextProfile)
  }, [])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return

      setSession(data.session)

      if (data.session?.user) {
        try {
          await loadProfile(data.session.user.id)
        } catch {
          setProfile(null)
        }
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)

      if (nextSession?.user) {
        void loadProfile(nextSession.user.id).catch(() => setProfile(null))
      } else {
        setProfile(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      throw error
    }
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw error
    }
    setProfile(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      isManager: profile?.role === 'manager',
      isExecutor: profile?.role === 'executor',
      signIn,
      signOut,
    }),
    [session, profile, loading, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth нужно использовать внутри AuthProvider')
  }
  return ctx
}
