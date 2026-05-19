import { createClient } from '@/lib/supabase/server'
import { para } from '@/lib/format'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()

  const bugun = new Date(); bugun.setHours(0,0,0,0)
  const buAy  = new Date(); buAy.setDate(1); buAy.setHours(0,0,0,0)

  const [
    { data: cari },           // acilis_bakiyesi dahil tüm bakiyeler
    { data: teklifler },
    { data: tahsilatlar },
    { data: musteriler },
    { data: urunler },
    { data: sonTeklifler },
    { data: sonTahsilatlar },
  ] = await Promise.all([
    // musteri_cari view'ı: acilis_bakiyesi + borç - tahsilat = bakiye
    supabase.from('musteri_cari').select('bakiye, toplam_borc, toplam_tahsilat, acilis_bakiyesi'),
    supabase.from('teklifler').select('genel_toplam, durum, tarih'),
    supabase.from('tahsilatlar').select('tutar, tarih, iptal'),
    supabase.from('musteriler').select('id, aktif'),
    supabase.from('urunler').select('id, aktif'),
    supabase.from('teklifler')
      .select('id, teklif_no, genel_toplam, tarih, durum, musteriler(musteri_adi)')
      .order('tarih', { ascending: false }).limit(3),
    supabase.from('tahsilatlar')
      .select('id, tahsilat_no, tutar, tarih, iptal, musteriler(musteri_adi)')
      .order('tarih', { ascending: false }).limit(3),
  ])

  // Gerçek açık bakiye: tüm müşterilerin bakiye toplamı (acilis_bakiyesi dahil)
  const acikBakiye = (cari ?? []).reduce((s, m) => s + (m.bakiye ?? 0), 0)

  // Bu ay aktif teklif toplamı
  const buAyTeklif = (teklifler ?? [])
    .filter(t => t.durum === 'aktif' && new Date(t.tarih) >= buAy)
    .reduce((s, t) => s + t.genel_toplam, 0)

  // Bugün tahsilat
  const bugunTahsilat = (tahsilatlar ?? [])
    .filter(t => !t.iptal && new Date(t.tarih) >= bugun)
    .reduce((s, t) => s + t.tutar, 0)

  // Toplam tahsilat (aktif)
  const toplamTahsilat = (tahsilatlar ?? [])
    .filter(t => !t.iptal)
    .reduce((s, t) => s + t.tutar, 0)

  const musteriSayisi = (musteriler ?? []).filter(m => m.aktif).length
  const urunSayisi    = (urunler ?? []).filter(u => u.aktif).length

  const sonHareketler = [
    ...((sonTeklifler ?? []).map(t => ({
      id: t.id, tip: 'teklif' as const,
      baslik: `Teklif #${t.teklif_no}`,
      musteri: (t.musteriler as any)?.musteri_adi ?? '-',
      tutar: t.genel_toplam, tarih: t.tarih,
      durum: t.durum, href: `/teklifler/${t.id}`,
    }))),
    ...((sonTahsilatlar ?? []).map(t => ({
      id: t.id, tip: 'tahsilat' as const,
      baslik: `Tahsilat #${t.tahsilat_no}`,
      musteri: (t.musteriler as any)?.musteri_adi ?? '-',
      tutar: t.tutar, tarih: t.tarih,
      durum: t.iptal ? 'iptal' : 'aktif', href: `/tahsilatlar/${t.id}`,
    }))),
  ].sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime()).slice(0, 5)

  const stats = [
    { label: 'Açık Bakiye',     value: `₺${para(acikBakiye)}`,     cls: acikBakiye > 0 ? 'negative' : acikBakiye < 0 ? 'positive' : '' },
    { label: 'Bu Ay Teklif',    value: `₺${para(buAyTeklif)}`,     cls: '' },
    { label: 'Bugün Tahsilat',  value: `₺${para(bugunTahsilat)}`,  cls: bugunTahsilat > 0 ? 'positive' : '' },
    { label: 'Müşteri',         value: String(musteriSayisi),       cls: '' },
    { label: 'Ürün',            value: String(urunSayisi),          cls: '' },
    { label: 'Toplam Tahsilat', value: `₺${para(toplamTahsilat)}`, cls: toplamTahsilat > 0 ? 'positive' : '' },
  ]

  return <DashboardClient stats={stats} sonHareketler={sonHareketler} />
}
