import { createClient } from '@/lib/supabase/server'
import TahsilatlarClient from './TahsilatlarClient'

export default async function TahsilatlarPage({
  searchParams,
}: {
  searchParams: Promise<{ yeni?: string }>
}) {
  const { yeni } = await searchParams
  const supabase = await createClient()
  const [{ data: tahsilatlar }, { data: musteriler }] = await Promise.all([
    supabase.from('tahsilatlar').select('*, musteriler(musteri_adi)').order('tarih', { ascending: false }),
    supabase.from('musteriler').select('id, musteri_adi, adres').eq('aktif', true).order('musteri_adi'),
  ])
  return (
    <TahsilatlarClient
      tahsilatlar={(tahsilatlar ?? []) as any}
      musteriler={musteriler ?? []}
      autoAcik={yeni === '1'}
    />
  )
}
