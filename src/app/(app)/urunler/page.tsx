import { createClient } from '@/lib/supabase/server'
import UrunlerClient from './UrunlerClient'

export default async function UrunlerPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('urunler').select('*').order('urun_adi')
  return <UrunlerClient urunler={(data??[]) as any} />
}
