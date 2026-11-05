import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error(
    'Задайте VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY в файле .env',
  )
}

export const supabase = createClient<Database>(url, key)
