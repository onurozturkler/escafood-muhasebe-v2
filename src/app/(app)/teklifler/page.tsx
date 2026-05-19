import { createClient } from '@/lib/supabase/server'
import TekliflerClient from './TekliflerClient'

export default async function TekliflerPage() {
  const supabase = await createClient()
  const { data: teklifler } = await supabase
    .from('teklifler')
    .select('*, musteriler(musteri_adi)')
    .order('tarih', { ascending: false })

  return <TekliflerClient teklifler={(teklifler ?? []) as any} />
}
