import { createClient } from '@supabase/supabase-js'

const url =
  (import.meta.env.VITE_SUPABASE_URL as string) ||
  'https://pknmazjydokjrmctklog.supabase.co'

const key =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  'sb_publishable_-sJWI5NEIUXuVTqc5CKtvA_Yi_WfDuY'

export const supabase = createClient(url, key)

