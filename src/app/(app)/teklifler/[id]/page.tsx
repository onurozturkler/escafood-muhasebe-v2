import { createClient } from '@/lib/supabase/server'
import { para, tarih } from '@/lib/format'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import TeklifActions from './TeklifActions'

export default async function TeklifDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: teklif } = await supabase
    .from('teklifler').select('*, musteriler(musteri_adi, adres), teklif_kalemleri(*)')
    .eq('id', id).order('sira', { referencedTable: 'teklif_kalemleri', ascending: true }).single()

  if (!teklif) notFound()

  const musteri = teklif.musteriler as any
  const kalemler = (teklif.teklif_kalemleri as any[]) ?? []

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <Link href="/teklifler" style={{ fontSize: 12, color: '#9099A8', textDecoration: 'none', display: 'block', marginBottom: 6 }}>← Teklifler</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.03em', color: '#111318' }}>
              Teklif #{teklif.teklif_no}
            </h1>
            <span className={`badge ${teklif.durum === 'aktif' ? 'badge-green' : teklif.durum === 'iptal' ? 'badge-red' : 'badge-blue'}`}>
              {teklif.durum === 'aktif' ? 'Aktif' : teklif.durum === 'iptal' ? 'İptal' : 'Onaylandı'}
            </span>
          </div>
          <p style={{ fontSize: 13, color: '#9099A8', marginTop: 4 }}>{tarih(teklif.tarih)}</p>
        </div>
        <TeklifActions teklif={teklif as any} musteri={musteri} kalemler={kalemler} />
      </div>

      <div className="card" style={{ padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: '#9099A8', marginBottom: 8 }}>Müşteri</div>
        <div style={{ fontWeight: 600, fontSize: 15, color: '#111318' }}>{musteri?.musteri_adi ?? '-'}</div>
        {musteri?.adres && <div style={{ fontSize: 13, color: '#9099A8', marginTop: 3 }}>{musteri.adres}</div>}
      </div>

      <div className="card" style={{ marginBottom: 16, overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Ürün</th><th>Barkod</th>
              <th style={{ textAlign: 'right' }}>Birim Fiyat</th>
              <th style={{ textAlign: 'right' }}>Miktar</th>
              <th style={{ textAlign: 'right' }}>Toplam</th>
            </tr>
          </thead>
          <tbody>
            {kalemler.map((k: any) => (
              <tr key={k.id}>
                <td style={{ fontWeight: 500 }}>{k.urun_adi}</td>
                <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#9099A8' }}>{k.barkod ?? '-'}</td>
                <td style={{ textAlign: 'right', fontFamily: 'DM Mono, monospace', fontSize: 13 }}>₺{para(k.birim_fiyat)}</td>
                <td style={{ textAlign: 'right', fontFamily: 'DM Mono, monospace', fontSize: 13 }}>{k.miktar}</td>
                <td style={{ textAlign: 'right', fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 600 }}>₺{para(k.toplam)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ padding: '14px 20px', borderTop: '1px solid #ECEEF2', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <div style={{ display: 'flex', gap: 48, fontSize: 13, color: '#5A6072' }}>
            <span>Ara toplam</span>
            <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 500 }}>₺{para(teklif.ara_toplam)}</span>
          </div>
          {teklif.iskonto_orani > 0 && (
            <div style={{ display: 'flex', gap: 48, fontSize: 13, color: 'var(--brand)' }}>
              <span>İskonto (%{teklif.iskonto_orani})</span>
              <span style={{ fontFamily: 'DM Mono, monospace' }}>−₺{para(teklif.iskonto_tutar)}</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 48, fontSize: 16, fontWeight: 700, color: '#111318', borderTop: '1px solid #ECEEF2', paddingTop: 10, marginTop: 4 }}>
            <span>Genel Toplam</span>
            <span style={{ fontFamily: 'DM Mono, monospace', color: 'var(--brand)' }}>₺{para(teklif.genel_toplam)}</span>
          </div>
        </div>
      </div>

      {teklif.notlar && (
        <div className="card" style={{ padding: '14px 20px', fontSize: 13, color: '#5A6072', background: '#FAFBFC' }}>
          <span style={{ fontWeight: 600, color: '#9099A8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em' }}>Not: </span>
          {teklif.notlar}
        </div>
      )}
    </div>
  )
}
