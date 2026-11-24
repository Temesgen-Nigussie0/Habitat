import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || ''
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || ''

export function isSupabaseAuthConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey)
}

let cachedClient: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseAuthConfigured()) return null
  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return cachedClient
}

export async function signInWithGoogle(): Promise<{ error?: string }> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return { error: 'Supabase is not configured yet.' }
  }
  const redirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}/profile` : undefined

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  })
  if (error) {
    return { error: error.message }
  }
  return {}
}

export async function signOutGoogle(): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) return
  await supabase.auth.signOut()
}
