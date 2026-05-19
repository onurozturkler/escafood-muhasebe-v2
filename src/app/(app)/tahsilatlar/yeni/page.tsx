'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { para } from '@/lib/format'
import { tahsilatPDF } from '@/lib/pdf'
import Link from 'next/link'

type Musteri = { id: string; musteri_adi: string; adres: string | null }

function bugunStr() { return new Date().toISOString().split('T')[0] }

export default function YeniTahsilatPage() {
  const router = useRouter()
  const supabase = createClient()

  const [musteriler, setMusteriler] = useState<Musteri[]>([])
  const [musteriQ, setMusteriQ]     = useState('')
  const [musteriOpen, setMusteriOpen] = useState(false)
  const [musteriId, setMusteriId]   = useState('')
  const [bakiye, setBakiye]         = useState<number | null>(null)
  const [loadingBakiye, setLoadingBakiye] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [son, setSon]               = useState<any>(null)

  const [form, setForm] = useState({
    tutar:          '',
    tahsilat_turu:  'nakit',
    tarih:          bugunStr(),
    aciklama:       '',
    cek_no:         '',
    senet_vadesi:   '',
    banka_aciklama: '',
  })

  useEffect(() => {
    supabase.from('musteriler').select('id, musteri_adi, adres')
      .eq('aktif', true).order('musteri_adi')
      .then(({ data }) => setMusteriler(data ?? []))
  }, [])

  const secilenMusteri = musteriler.find(m => m.id === musteriId)
  const filtMusteriler = musteriler.filter(m =>
    m.musteri_adi.toLowerCase().includes(musteriQ.toLowerCase())
  )

  const musteriSec = async (m: Musteri) => {
    setMusteriId(m.id)
    setMusteriQ('')
    setMusteriOpen(false)
    setLoadingBakiye(true)
    const { data } = await supabase.from('musteri_cari').select('bakiye').eq('id', m.id).single()
    setBakiye(data?.bakiye ?? null)
    setLoadingBakiye(false)
  }

  const sonrakiBakiye = bakiye !== null && form.tutar
    ? bakiye - parseFloat(form.tutar)
    : null

  const kaydet = async () => {
    if (!musteriId || !form.tutar) return
    setSaving(true)

    const aciklama = [
      form.aciklama,
      form.cek_no         ? `Çek No: ${form.cek_no}` : '',
      form.senet_vadesi   ? `Senet Vadesi: ${form.senet_vadesi}` : '',
      form.banka_aciklama ? `Banka: ${form.banka_aciklama}` : '',
    ].filter(Boolean).join(' | ')

    const { data, error } = await supabase.from('tahsilatlar').insert({
      musteri_id:    musteriId,
      tutar:         parseFloat(form.tutar),
      tahsilat_turu: form.tahsilat_turu,
      aciklama:      aciklama || null,
      tarih:         form.tarih,
    }).select().single()

    setSaving(false)
    if (error) { alert(error.message); return }
    setSon(data)
  }

  // Kaydedildi ekranı
  if (son) {
    return (
      <div style={{ maxWidth: 480 }}>
        <div style={{ marginBottom: 24 }}>
          <Link href="/tahsilatlar" style={{ fontSize: 12, color: '#9099A8', textDecoration: 'none', display: 'block', marginBottom: 6 }}>← Tahsilatlar</Link>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.03em' }}>Tahsilat Kaydedildi</h1>
        </div>
        <div className="card" style={{ padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#EDFAF3', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>✓</div>
          <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>#{son.tahsilat_no}</p>
          <p style={{ fontSize: 14, color: '#9099A8', marginBottom: 8 }}>{secilenMusteri?.musteri_adi}</p>
          <p style={{ fontSize: 28, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: '#15803D', marginBottom: 24 }}>
            ₺{para(son.tutar)}
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => tahsilatPDF(son, secilenMusteri)} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
              PDF İndir
            </button>
            <Link href="/tahsilatlar/yeni" className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => setSon(null)}>
              Yeni Tahsilat
            </Link>
            <Link href="/tahsilatlar" className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
              Listeye Dön
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12 }}>
        <div>
          <Link href="/tahsilatlar" style={{ fontSize: 12, color: '#9099A8', textDecoration: 'none', display: 'block', marginBottom: 6 }}>← Tahsilatlar</Link>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.03em' }}>Yeni Tahsilat</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label className="form-label" style={{ margin: 0 }}>Tarih</label>
          <input type="date" value={form.tarih} max={bugunStr()}
            onChange={e => setForm(f => ({ ...f, tarih: e.target.value }))}
            className="form-input" style={{ width: 145 }} />
        </div>
      </div>

      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Müşteri arama */}
          <div>
            <label className="form-label">Müşteri</label>
            <div style={{ position: 'relative' }}>
              <input
                value={musteriId ? secilenMusteri?.musteri_adi ?? '' : musteriQ}
                onChange={e => { if (!musteriId) { setMusteriQ(e.target.value); setMusteriOpen(true) } }}
                onFocus={() => { if (!musteriId) setMusteriOpen(true) }}
                placeholder="Müşteri adı yazın veya seçin..."
                className="form-input"
              />
              {musteriId && (
                <button onClick={() => { setMusteriId(''); setBakiye(null); setMusteriQ('') }}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9099A8', cursor: 'pointer', fontSize: 18 }}>×</button>
              )}
              {musteriOpen && !musteriId && filtMusteriler.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #E2E5EC', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: 20, maxHeight: 200, overflowY: 'auto', marginTop: 2 }}>
                  {filtMusteriler.map(m => (
                    <div key={m.id} onClick={() => musteriSec(m)}
                      style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #F3F4F6' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <div style={{ fontWeight: 500 }}>{m.musteri_adi}</div>
                      {m.adres && <div style={{ fontSize: 11, color: '#9099A8' }}>{m.adres}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bakiye göstergesi */}
            {musteriId && (
              <div style={{ marginTop: 8, padding: '10px 14px', borderRadius: 8, background: bakiye != null && bakiye > 0 ? '#FEF0F0' : '#EDFAF3', border: '1px solid', borderColor: bakiye != null && bakiye > 0 ? '#FECACA' : '#A7F3D0' }}>
                {loadingBakiye ? (
                  <span style={{ fontSize: 12, color: '#9099A8' }}>Bakiye yükleniyor...</span>
                ) : bakiye !== null ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#5A6072' }}>Mevcut bakiye</span>
                      <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: bakiye > 0 ? 'var(--brand)' : '#15803D' }}>
                        ₺{para(bakiye)}
                      </span>
                    </div>
                    {sonrakiBakiye !== null && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(0,0,0,.08)' }}>
                        <span style={{ fontSize: 12, color: '#5A6072' }}>Tahsilat sonrası</span>
                        <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: sonrakiBakiye > 0 ? 'var(--brand)' : '#15803D' }}>
                          ₺{para(sonrakiBakiye)}
                        </span>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            )}
          </div>

          {/* Tahsilat türü */}
          <div>
            <label className="form-label">Tahsilat Türü</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
              {[
                { val: 'nakit',      label: 'Nakit' },
                { val: 'eft_havale', label: 'EFT/Havale' },
                { val: 'cek',        label: 'Çek' },
                { val: 'senet',      label: 'Senet' },
                { val: 'diger',      label: 'Diğer' },
              ].map(t => (
                <button key={t.val}
                  onClick={() => setForm(f => ({ ...f, tahsilat_turu: t.val }))}
                  style={{
                    padding: '8px 4px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                    cursor: 'pointer', border: '1.5px solid',
                    borderColor: form.tahsilat_turu === t.val ? 'var(--brand)' : '#E2E5EC',
                    background: form.tahsilat_turu === t.val ? 'var(--brand-soft)' : '#fff',
                    color: form.tahsilat_turu === t.val ? 'var(--brand)' : '#374151',
                    transition: 'all 120ms',
                  }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Türe göre ek alan */}
          {form.tahsilat_turu === 'cek' && (
            <div>
              <label className="form-label">Çek No</label>
              <input type="text" value={form.cek_no} placeholder="Çek numarası"
                onChange={e => setForm(f => ({ ...f, cek_no: e.target.value }))} className="form-input" />
            </div>
          )}
          {form.tahsilat_turu === 'senet' && (
            <div>
              <label className="form-label">Senet Vadesi</label>
              <input type="date" value={form.senet_vadesi}
                onChange={e => setForm(f => ({ ...f, senet_vadesi: e.target.value }))} className="form-input" />
            </div>
          )}
          {form.tahsilat_turu === 'eft_havale' && (
            <div>
              <label className="form-label">Banka / Referans</label>
              <input type="text" value={form.banka_aciklama} placeholder="Banka adı veya transfer referansı"
                onChange={e => setForm(f => ({ ...f, banka_aciklama: e.target.value }))} className="form-input" />
            </div>
          )}

          {/* Tutar */}
          <div>
            <label className="form-label">Tutar (₺)</label>
            <input type="number" value={form.tutar} min="0" step="0.01" placeholder="0,00"
              onChange={e => setForm(f => ({ ...f, tutar: e.target.value }))}
              className="form-input"
              style={{ fontSize: 20, fontWeight: 700, fontFamily: 'DM Mono, monospace', padding: '12px 16px' }} />
          </div>

          {/* Açıklama */}
          <div>
            <label className="form-label">Açıklama</label>
            <input type="text" value={form.aciklama} placeholder="Opsiyonel"
              onChange={e => setForm(f => ({ ...f, aciklama: e.target.value }))} className="form-input" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={kaydet} disabled={saving || !musteriId || !form.tutar}
            className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '11px 0', fontSize: 14 }}>
            {saving ? 'Kaydediliyor...' : 'Tahsilatı Kaydet'}
          </button>
          <button onClick={() => router.back()} className="btn btn-secondary">İptal</button>
        </div>
      </div>
    </div>
  )
}
