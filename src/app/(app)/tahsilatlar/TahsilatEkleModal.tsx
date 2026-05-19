'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { tahsilatPDF } from '@/lib/pdf'
import { para } from '@/lib/format'

type Props = { musteriler: { id:string; musteri_adi:string; adres:string|null }[]; autoAcik?:boolean }

function bugunStr() { return new Date().toISOString().split('T')[0] }

export default function TahsilatEkleModal({ musteriler, autoAcik }: Props) {
  const router = useRouter()
  const [open, setOpen]     = useState(false)
  const [saving, setSaving] = useState(false)
  const [son, setSon]       = useState<any>(null)
  const [sonMusteri, setSonMusteri] = useState<any>(null)
  const [bakiye, setBakiye] = useState<number|null>(null)
  const [loadingBakiye, setLoadingBakiye] = useState(false)
  const [form, setForm] = useState({
    musteri_id:'', tutar:'', tahsilat_turu:'nakit', aciklama:'', tarih:bugunStr(),
    cek_no:'', senet_vadesi:'', banka_aciklama:'',
  })

  const musteriSec = async (id: string) => {
    setForm(f => ({ ...f, musteri_id: id }))
    if (!id) { setBakiye(null); return }
    setLoadingBakiye(true)
    const { data } = await createClient().from('musteri_cari').select('bakiye').eq('id', id).single()
    setBakiye(data?.bakiye ?? null)
    setLoadingBakiye(false)
  }

  const sonrakiBakiye = bakiye !== null && form.tutar
    ? bakiye - parseFloat(form.tutar)
    : null

  const kaydet = async () => {
    if (!form.musteri_id || !form.tutar) return
    setSaving(true)
    const aciklama = [
      form.aciklama,
      form.cek_no ? `Çek No: ${form.cek_no}` : '',
      form.senet_vadesi ? `Senet Vadesi: ${form.senet_vadesi}` : '',
      form.banka_aciklama ? `Banka: ${form.banka_aciklama}` : '',
    ].filter(Boolean).join(' | ')

    const { data, error } = await createClient().from('tahsilatlar').insert({
      musteri_id: form.musteri_id, tutar: parseFloat(form.tutar),
      tahsilat_turu: form.tahsilat_turu, aciklama: aciklama || null, tarih: form.tarih,
    }).select().single()
    setSaving(false)
    if (error) { alert(error.message); return }
    setSon(data); setSonMusteri(musteriler.find(m=>m.id===form.musteri_id))
    setForm({ musteri_id:'', tutar:'', tahsilat_turu:'nakit', aciklama:'', tarih:bugunStr(), cek_no:'', senet_vadesi:'', banka_aciklama:'' })
    setBakiye(null)
    router.refresh()
  }

  const kapat = () => { setOpen(false); setSon(null); setSonMusteri(null) }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn btn-primary">+ Yeni Tahsilat</button>

      {open && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) kapat() }}>
          <div className="modal-box">
            {!son ? (
              <>
                <div style={{ padding:'22px 24px 0' }}>
                  <h2 style={{ fontSize:16, fontWeight:700, marginBottom:20 }}>Yeni Tahsilat</h2>
                  <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                    <div>
                      <label className="form-label">Müşteri</label>
                      <select value={form.musteri_id} onChange={e=>musteriSec(e.target.value)} className="form-input">
                        <option value="">Seçin...</option>
                        {musteriler.map(m=><option key={m.id} value={m.id}>{m.musteri_adi}</option>)}
                      </select>
                      {/* Bakiye göster */}
                      {form.musteri_id && (
                        <div style={{ marginTop:6, padding:'8px 12px', borderRadius:7, background: bakiye!=null && bakiye>0 ? '#FEF0F0' : '#EDFAF3', border:'1px solid', borderColor: bakiye!=null && bakiye>0 ? '#FECACA' : '#A7F3D0' }}>
                          {loadingBakiye ? (
                            <span style={{ fontSize:12, color:'#9099A8' }}>Bakiye yükleniyor...</span>
                          ) : bakiye !== null ? (
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                              <span style={{ fontSize:12, color:'#5A6072' }}>Mevcut bakiye:</span>
                              <span style={{ fontSize:13, fontWeight:700, fontFamily:'DM Mono,monospace', color: bakiye>0?'var(--brand)':'#15803D' }}>₺{para(bakiye)}</span>
                            </div>
                          ) : null}
                          {sonrakiBakiye !== null && (
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:4, paddingTop:4, borderTop:'1px solid rgba(0,0,0,.06)' }}>
                              <span style={{ fontSize:12, color:'#5A6072' }}>Sonraki bakiye:</span>
                              <span style={{ fontSize:13, fontWeight:700, fontFamily:'DM Mono,monospace', color: sonrakiBakiye>0?'var(--brand)':'#15803D' }}>₺{para(sonrakiBakiye)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="form-label">Tahsilat Türü</label>
                      <select value={form.tahsilat_turu} onChange={e=>setForm(f=>({...f,tahsilat_turu:e.target.value}))} className="form-input">
                        <option value="nakit">Nakit</option>
                        <option value="eft_havale">EFT / Havale</option>
                        <option value="cek">Çek</option>
                        <option value="senet">Senet</option>
                        <option value="diger">Diğer</option>
                      </select>
                    </div>

                    {/* Türe göre ek alanlar */}
                    {form.tahsilat_turu === 'cek' && (
                      <div>
                        <label className="form-label">Çek No</label>
                        <input type="text" value={form.cek_no} placeholder="Çek numarası" onChange={e=>setForm(f=>({...f,cek_no:e.target.value}))} className="form-input" />
                      </div>
                    )}
                    {form.tahsilat_turu === 'senet' && (
                      <div>
                        <label className="form-label">Senet Vadesi</label>
                        <input type="date" value={form.senet_vadesi} onChange={e=>setForm(f=>({...f,senet_vadesi:e.target.value}))} className="form-input" />
                      </div>
                    )}
                    {form.tahsilat_turu === 'eft_havale' && (
                      <div>
                        <label className="form-label">Banka / Açıklama</label>
                        <input type="text" value={form.banka_aciklama} placeholder="Banka adı veya referans" onChange={e=>setForm(f=>({...f,banka_aciklama:e.target.value}))} className="form-input" />
                      </div>
                    )}

                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                      <div>
                        <label className="form-label">Tutar (₺)</label>
                        <input type="number" value={form.tutar} min="0" step="0.01" placeholder="0.00" onChange={e=>setForm(f=>({...f,tutar:e.target.value}))} className="form-input" />
                      </div>
                      <div>
                        <label className="form-label">Tarih</label>
                        <input type="date" value={form.tarih} max={bugunStr()} onChange={e=>setForm(f=>({...f,tarih:e.target.value}))} className="form-input" />
                      </div>
                    </div>

                    <div>
                      <label className="form-label">Açıklama</label>
                      <input type="text" value={form.aciklama} placeholder="Opsiyonel" onChange={e=>setForm(f=>({...f,aciklama:e.target.value}))} className="form-input" />
                    </div>
                  </div>
                </div>
                <div style={{ padding:'20px 24px', display:'flex', gap:10 }}>
                  <button onClick={kaydet} disabled={saving||!form.musteri_id||!form.tutar} className="btn btn-primary" style={{ flex:1, justifyContent:'center' }}>
                    {saving?'Kaydediliyor...':'Kaydet'}
                  </button>
                  <button onClick={kapat} className="btn btn-secondary" style={{ flex:1, justifyContent:'center' }}>İptal</button>
                </div>
              </>
            ) : (
              <div style={{ padding:'32px 24px', textAlign:'center' }}>
                <div style={{ width:48, height:48, borderRadius:'50%', background:'#EDFAF3', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:22 }}>✓</div>
                <p style={{ fontWeight:700, fontSize:16, marginBottom:4 }}>Tahsilat kaydedildi</p>
                <p style={{ fontSize:13, color:'#9099A8', marginBottom:24 }}>#{son.tahsilat_no} — {sonMusteri?.musteri_adi}</p>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={()=>tahsilatPDF(son,sonMusteri)} className="btn btn-primary" style={{ flex:1, justifyContent:'center' }}>PDF İndir</button>
                  <button onClick={kapat} className="btn btn-secondary" style={{ flex:1, justifyContent:'center' }}>Kapat</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
