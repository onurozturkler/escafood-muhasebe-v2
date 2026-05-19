import { createClient } from '@/lib/supabase/server'
import MusterilerClient from './MusterilerClient'

export default async function MusterilerPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('musteri_cari').select('*').order('musteri_adi')
  return <MusterilerClient musteriler={(data ?? []) as any} />
}
