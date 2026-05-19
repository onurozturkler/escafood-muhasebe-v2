'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function YeniMusteriPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ musteri_adi:'', adres:'', telefon:'', email:'', acilis_bakiyesi:'' })

  const kaydet = async () => {
    if (!form.musteri_adi) return
    setSaving(true)
    const { error } = await createClient().from('musteriler').insert({
      musteri_adi: form.musteri_adi,
      adres:       form.adres || null,
      telefon:     form.telefon || null,
      email:       form.email || null,
      acilis_bakiyesi: parseFloat(form.acilis_bakiyesi) || 0,
    })
    setSaving(false)
    if (error) { alert(error.message); return }
    router.push('/musteriler'); router.refresh()
  }

  return (
    <div style={{ maxWidth:520 }}>
      <div style={{ marginBottom:24 }}>
        <Link href="/musteriler" style={{ fontSize:12, color:'#9099A8', textDecoration:'none', display:'block', marginBottom:6 }}>← Müşteriler</Link>
        <h1 style={{ fontSize:22, fontWeight:700, letterSpacing:'-.03em' }}>Yeni Müşteri</h1>
      </div>
      <div className="card" style={{ padding:'24px' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {[
            { key:'musteri_adi', label:'Müşteri Adı *', type:'text' },
            { key:'adres',       label:'Adres',          type:'text' },
            { key:'telefon',     label:'Telefon',         type:'tel' },
            { key:'email',       label:'E-posta',         type:'email' },
          ].map(f => (
            <div key={f.key}>
              <label className="form-label">{f.label}</label>
              <input type={f.type} value={(form as any)[f.key]}
                onChange={e => setForm(p=>({...p,[f.key]:e.target.value}))}
                className="form-input" />
            </div>
          ))}
          <div>
            <label className="form-label">Açılış Bakiyesi (₺)</label>
            <input type="number" value={form.acilis_bakiyesi} step="0.01" placeholder="0.00"
              onChange={e => setForm(p=>({...p,acilis_bakiyesi:e.target.value}))}
              className="form-input" />
            <p style={{ fontSize:11, color:'#9099A8', marginTop:4 }}>Önceki dönem borcu için pozitif, alacak için negatif</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:10, marginTop:24 }}>
          <button onClick={kaydet} disabled={saving||!form.musteri_adi} className="btn btn-primary" style={{ flex:1, justifyContent:'center' }}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
          <button onClick={()=>router.back()} className="btn btn-secondary" style={{ flex:1, justifyContent:'center' }}>İptal</button>
        </div>
      </div>
    </div>
  )
}
