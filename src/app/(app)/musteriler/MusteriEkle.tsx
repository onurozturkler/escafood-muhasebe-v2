'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function MusteriEkle() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ musteri_adi: '', adres: '', telefon: '', email: '', acilis_bakiyesi: '' })

  const kaydet = async () => {
    if (!form.musteri_adi) return
    setSaving(true)
    const { error } = await createClient().from('musteriler').insert({
      musteri_adi: form.musteri_adi, adres: form.adres || null,
      telefon: form.telefon || null, email: form.email || null,
      acilis_bakiyesi: parseFloat(form.acilis_bakiyesi) || 0,
    })
    setSaving(false)
    if (error) { alert(error.message); return }
    setOpen(false)
    setForm({ musteri_adi: '', adres: '', telefon: '', email: '', acilis_bakiyesi: '' })
    router.refresh()
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn btn-primary">+ Yeni Müşteri</button>

      {open && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="modal-box">
            <div style={{ padding: '22px 24px 0' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-.02em', marginBottom: 20 }}>Yeni Müşteri</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { key: 'musteri_adi', label: 'Müşteri Adı', type: 'text', required: true },
                  { key: 'adres', label: 'Adres', type: 'text' },
                  { key: 'telefon', label: 'Telefon', type: 'tel' },
                  { key: 'email', label: 'E-posta', type: 'email' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="form-label">{f.label}{f.required && ' *'}</label>
                    <input type={f.type} value={(form as any)[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="form-input" />
                  </div>
                ))}
                <div>
                  <label className="form-label">Açılış Bakiyesi (₺)</label>
                  <input type="number" value={form.acilis_bakiyesi} step="0.01" placeholder="0.00"
                    onChange={e => setForm(p => ({ ...p, acilis_bakiyesi: e.target.value }))}
                    className="form-input" />
                  <p style={{ fontSize: 11, color: '#9099A8', marginTop: 4 }}>
                    Önceki dönem borcu için pozitif, alacak için negatif
                  </p>
                </div>
              </div>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', gap: 10 }}>
              <button onClick={kaydet} disabled={saving || !form.musteri_adi} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
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
