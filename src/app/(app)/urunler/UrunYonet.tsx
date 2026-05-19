'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Urun } from '@/types'

type Props = { mod: 'ekle'; urun?: never } | { mod: 'duzenle'; urun: Urun }

export default function UrunYonet({ mod, urun }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    urun_adi: urun?.urun_adi ?? '', barkod: urun?.barkod ?? '',
    liste_fiyati: urun?.liste_fiyati ?? 0, birim: urun?.birim ?? 'adet', aktif: urun?.aktif ?? true,
  })

  const ac = () => {
    if (mod === 'duzenle' && urun) setForm({ urun_adi: urun.urun_adi, barkod: urun.barkod ?? '', liste_fiyati: urun.liste_fiyati, birim: urun.birim, aktif: urun.aktif })
    setOpen(true)
  }

  const kaydet = async () => {
    if (!form.urun_adi) return
    setSaving(true)
    const data = { urun_adi: form.urun_adi, barkod: form.barkod || null, liste_fiyati: form.liste_fiyati, birim: form.birim, aktif: form.aktif }
    const supabase = createClient()
    const { error } = mod === 'ekle' ? await supabase.from('urunler').insert(data) : await supabase.from('urunler').update(data).eq('id', urun!.id)
    setSaving(false)
    if (error) { alert(error.message); return }
    setOpen(false); router.refresh()
  }

  return (
    <>
      {mod === 'ekle'
        ? <button onClick={ac} className="btn btn-primary">+ Yeni Ürün</button>
        : <button onClick={ac} className="btn btn-ghost btn-sm">Düzenle</button>
      }

      {open && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="modal-box">
            <div style={{ padding: '22px 24px 0' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-.02em', marginBottom: 20 }}>
                {mod === 'ekle' ? 'Yeni Ürün' : 'Ürün Düzenle'}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="form-label">Ürün Adı *</label>
                  <input type="text" value={form.urun_adi} onChange={e => setForm(f => ({ ...f, urun_adi: e.target.value }))} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Barkod</label>
                  <input type="text" value={form.barkod} onChange={e => setForm(f => ({ ...f, barkod: e.target.value }))} className="form-input" style={{ fontFamily: 'DM Mono, monospace' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Liste Fiyatı (₺)</label>
                    <input type="number" value={form.liste_fiyati} min="0" step="0.01"
                      onChange={e => setForm(f => ({ ...f, liste_fiyati: parseFloat(e.target.value) || 0 }))} className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Birim</label>
                    <select value={form.birim} onChange={e => setForm(f => ({ ...f, birim: e.target.value }))} className="form-input">
                      {['adet','kg','lt','koli','paket'].map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>
                {mod === 'duzenle' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={form.aktif} onChange={e => setForm(f => ({ ...f, aktif: e.target.checked }))} />
                    Aktif
                  </label>
                )}
              </div>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', gap: 10 }}>
              <button onClick={kaydet} disabled={saving || !form.urun_adi} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
              <button onClick={() => setOpen(false)} className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>İptal</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
