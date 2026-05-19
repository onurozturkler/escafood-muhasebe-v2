import { createClient } from '@/lib/supabase/server'
import { para, tarih, tahsilatTuruLabel } from '@/lib/format'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import TahsilatActions from './TahsilatActions'

export default async function TahsilatDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: tahsilat } = await supabase
    .from('tahsilatlar')
    .select('*, musteriler(musteri_adi, adres)')
    .eq('id', id)
    .single()

  if (!tahsilat) notFound()

  const musteri = tahsilat.musteriler as any

  const bilgiler = [
    { label: 'Makbuz No',     value: String(tahsilat.tahsilat_no) },
    { label: 'Tarih',         value: tarih(tahsilat.tarih) },
    { label: 'Müşteri',       value: musteri?.musteri_adi ?? '-' },
    { label: 'Adres',         value: musteri?.adres ?? '-' },
    { label: 'Tahsilat Türü', value: tahsilatTuruLabel[tahsilat.tahsilat_turu] ?? tahsilat.tahsilat_turu },
    { label: 'Açıklama',      value: tahsilat.aciklama ?? '-' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <Link href="/tahsilatlar" style={{ fontSize: 12, color: '#9099A8', textDecoration: 'none', display: 'block', marginBottom: 6 }}>← Tahsilatlar</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.03em', color: '#111318' }}>
              Tahsilat #{tahsilat.tahsilat_no}
            </h1>
            <span className={`badge ${tahsilat.iptal ? 'badge-red' : 'badge-green'}`}>
              {tahsilat.iptal ? 'İptal' : 'Aktif'}
            </span>
          </div>
          <p style={{ fontSize: 13, color: '#9099A8', marginTop: 4 }}>{tarih(tahsilat.tarih)}</p>
        </div>
        <TahsilatActions tahsilat={tahsilat as any} musteri={musteri} />
      </div>

      <div className="card" style={{ padding: '6px 0', marginBottom: 16 }}>
        {bilgiler.map((b, i) => (
          <div key={i} style={{
            display: 'flex', gap: 16, padding: '12px 22px',
            borderBottom: i < bilgiler.length - 1 ? '1px solid #F3F4F6' : 'none',
            alignItems: 'flex-start',
          }}>
            <div style={{ width: 130, flexShrink: 0, fontSize: 12, fontWeight: 600, letterSpacing: '.03em', textTransform: 'uppercase', color: '#9099A8' }}>{b.label}</div>
            <div style={{ fontSize: 14, color: '#111318', fontWeight: b.label === 'Makbuz No' ? 600 : 400 }}>{b.value}</div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 16, padding: '12px 22px', alignItems: 'center' }}>
          <div style={{ width: 130, flexShrink: 0, fontSize: 12, fontWeight: 600, letterSpacing: '.03em', textTransform: 'uppercase', color: '#9099A8' }}>Tutar</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: tahsilat.iptal ? '#9099A8' : '#15803D', fontFamily: 'DM Mono, monospace', textDecoration: tahsilat.iptal ? 'line-through' : 'none' }}>
            ₺{para(tahsilat.tutar)}
          </div>
        </div>
      </div>
    </div>
  )
}
