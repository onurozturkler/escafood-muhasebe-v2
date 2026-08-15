import { createClient } from '@/lib/supabase/server'
import { para, tarih } from '@/lib/format'
import { bakiyeSeyriTumu, hareketIsareti } from '@/lib/cari'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import EkstrePDFButton from './EkstrePDFButton'

export default async function MusteriDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: musteri }, { data: musteriDetay }, { data: teklifler }, { data: tahsilatlar }] = await Promise.all([
    supabase.from('musteri_cari').select('*').eq('id', id).single(),
    supabase.from('musteriler').select('created_at, telefon, email').eq('id', id).single(),
    supabase.from('teklifler').select('*').eq('musteri_id', id).order('tarih', { ascending: false }),
    supabase.from('tahsilatlar').select('*').eq('musteri_id', id).order('tarih', { ascending: false }),
  ])

  if (!musteri) notFound()

  const ham = [
    ...(teklifler?.map(t => ({
      id: t.id, tarih: t.tarih, tip: 'teklif' as const,
      no: `#${t.teklif_no}`, tutar: t.genel_toplam,
      iptal: t.durum === 'iptal', href: `/teklifler/${t.id}`,
      // Ekstre PDF'inin "Açıklama" kolonu bunu kullanır.
      aciklama: t.notlar ?? null,
      tahsilat_turu: null as string | null,
    })) ?? []),
    ...(tahsilatlar?.map(t => ({
      id: t.id, tarih: t.tarih, tip: 'tahsilat' as const,
      no: `TH${t.tahsilat_no}`, tutar: t.tutar,
      iptal: t.iptal, href: `/tahsilatlar/${t.id}`,
      aciklama: t.aciklama ?? null,
      tahsilat_turu: (t.tahsilat_turu ?? null) as string | null,
    })) ?? []),
  ]

  // Sıralama ve kümülatif bakiye src/lib/cari.ts'de — ekstre PDF'i ile aynı kod.
  const acilis = musteri.acilis_bakiyesi ?? 0
  const hareketler = bakiyeSeyriTumu(acilis, ham)

  const stats = [
    { label: 'Açılış Bakiyesi', value: musteri.acilis_bakiyesi ?? 0, cls: '' },
    { label: 'Toplam Borç',     value: musteri.toplam_borc,           cls: '' },
    { label: 'Tahsilat',        value: musteri.toplam_tahsilat,        cls: 'positive' },
    { label: 'Bakiye',          value: musteri.bakiye ?? 0,            cls: (musteri.bakiye ?? 0) > 0 ? 'negative' : 'positive' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <Link href="/musteriler" style={{ fontSize: 12, color: '#9099A8', textDecoration: 'none', display: 'block', marginBottom: 6 }}>← Müşteriler</Link>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.03em', color: '#111318', marginBottom: 3 }}>{musteri.musteri_adi}</h1>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {musteri.adres && <span style={{ fontSize: 13, color: '#9099A8' }}>{musteri.adres}</span>}
            {musteriDetay?.telefon && <span style={{ fontSize: 13, color: '#9099A8' }}>📞 {musteriDetay.telefon}</span>}
            {musteriDetay?.email && <span style={{ fontSize: 13, color: '#9099A8' }}>✉ {musteriDetay.email}</span>}
          </div>
          {musteriDetay?.created_at && (
            <p style={{ fontSize: 11, color: '#BCC1CB', marginTop: 4 }}>
              Kayıt tarihi: {tarih(musteriDetay.created_at)}
            </p>
          )}
        </div>
        <EkstrePDFButton musteri={musteri} hareketler={ham} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className={`stat-value ${s.cls}`} style={{ fontSize: 18 }}>₺{para(s.value)}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #ECEEF2', fontWeight: 600, fontSize: 13 }}>Hareket Defteri</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Tarih</th><th>Belge No</th><th>Tür</th>
              <th style={{ textAlign: 'right' }}>Tutar</th>
              <th style={{ textAlign: 'right' }}>Bakiye</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ color: '#9099A8' }}>—</td>
              <td style={{ color: '#9099A8', fontSize: 13 }}>Açılış</td>
              <td></td>
              <td></td>
              <td style={{ textAlign: 'right', fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 600, color: '#5A6072' }}>
                ₺{para(acilis)}
              </td>
            </tr>
            {hareketler.map(h => (
              <tr key={h.id} style={{ opacity: h.iptal ? .45 : 1 }}>
                <td style={{ color: '#9099A8' }}>{tarih(h.tarih)}</td>
                <td>
                  <Link href={h.href} style={{ color: 'var(--brand)', fontWeight: 600, textDecoration: 'none', fontSize: 13 }}>{h.no}</Link>
                </td>
                <td>
                  <span className={`badge ${h.tip === 'teklif' ? 'badge-orange' : 'badge-green'}`}>
                    {h.tip === 'teklif' ? 'Teklif' : 'Tahsilat'}
                  </span>
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 600,
                  textDecoration: h.iptal ? 'line-through' : 'none',
                  color: h.iptal ? '#9099A8' : h.tip === 'teklif' ? 'var(--brand)' : '#15803D' }}>
                  {hareketIsareti(h)}₺{para(h.tutar)}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 600,
                  color: h.bakiye === null ? '#BCC1CB' : '#111318' }}>
                  {h.bakiye === null ? '—' : `₺${para(h.bakiye)}`}
                </td>
              </tr>
            ))}
            {hareketler.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#9099A8', padding: '40px 0', fontSize: 13 }}>Henüz hareket yok</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
