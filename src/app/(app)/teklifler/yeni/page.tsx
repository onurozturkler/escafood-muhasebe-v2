'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { para } from '@/lib/format'
import type { Musteri, Urun, TeklifKalemForm } from '@/types'

function bugunStr() { return new Date().toISOString().split('T')[0] }

export default function YeniTeklifPage() {
  const router = useRouter()
  const supabase = createClient()
  const barkodRef = useRef<HTMLInputElement>(null)

  const [musteriler, setMusteriler]     = useState<Musteri[]>([])
  const [urunler, setUrunler]           = useState<Urun[]>([])
  const [musteriId, setMusteriId]       = useState('')
  const [musteriQ, setMusteriQ]         = useState('')
  const [musteriOpen, setMusteriOpen]   = useState(false)
  const [urunQ, setUrunQ]               = useState('')
  const [urunOpen, setUrunOpen]         = useState(false)
  const [barkod, setBarkod]             = useState('')
  const [iskontoTip, setIskontoTip]     = useState<'%'|'TL'>('%')
  const [iskontoVal, setIskontoVal]     = useState(0)
  const [notlar, setNotlar]             = useState('')
  const [tarih, setTarih]               = useState(bugunStr())
  const [kalemler, setKalemler]         = useState<TeklifKalemForm[]>([])
  const [saving, setSaving]             = useState(false)
  const [ozet, setOzet]                 = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('musteriler').select('*').eq('aktif', true).order('musteri_adi'),
      supabase.from('urunler').select('*').eq('aktif', true).order('urun_adi'),
    ]).then(([{data:m},{data:u}]) => { setMusteriler(m??[]); setUrunler(u??[]) })
  }, [])

  const filtMusteriler = musteriler.filter(m => m.musteri_adi.toLowerCase().includes(musteriQ.toLowerCase()))
  const filtUrunler    = urunler.filter(u => u.urun_adi.toLowerCase().includes(urunQ.toLowerCase()) || (u.barkod??'').includes(urunQ))
  const secilenMusteri = musteriler.find(m => m.id === musteriId)

  const urunEkle = (u: Urun) => {
    setKalemler(prev => [...prev, { urun_id:u.id, urun_adi:u.urun_adi, barkod:u.barkod??'', birim_fiyat:u.liste_fiyati, miktar:1, toplam:u.liste_fiyati }])
    setUrunQ(''); setUrunOpen(false)
  }

  const barkodAra = () => {
    const u = urunler.find(u => u.barkod === barkod.trim())
    if (u) { urunEkle(u); setBarkod('') }
    else alert('Barkod bulunamadı: ' + barkod)
  }

  const kalemGuncelle = (idx:number, field:keyof TeklifKalemForm, val:string|number) => {
    setKalemler(prev => prev.map((k,i) => {
      if(i!==idx) return k
      const yeni = {...k, [field]:val}
      if(field==='urun_adi' && urunler.find(u=>u.id===k.urun_id)?.urun_adi !== val) yeni.urun_id = null
      if(field==='miktar'||field==='birim_fiyat') yeni.toplam = (field==='miktar'?+val:k.miktar) * (field==='birim_fiyat'?+val:k.birim_fiyat)
      return yeni
    }))
  }

  const kalemKopyala = (idx:number) => setKalemler(prev => [...prev.slice(0,idx+1), {...prev[idx]}, ...prev.slice(idx+1)])

  const araToplam = kalemler.reduce((s,k)=>s+k.toplam,0)
  const iskontoTutar = iskontoTip==='%' ? araToplam*(iskontoVal/100) : iskontoVal
  const iskontoOrani = iskontoTip==='%' ? iskontoVal : araToplam > 0 ? (iskontoVal/araToplam)*100 : 0
  const genelToplam  = araToplam - iskontoTutar

  const kaydet = async () => {
    if (!musteriId || kalemler.length===0) return
    setSaving(true)

    const guncellenmis = [...kalemler]
    for (let i=0; i<guncellenmis.length; i++) {
      const k = guncellenmis[i]
      if (k.urun_id === null) {
        const ekle = confirm(`"${k.urun_adi}" ürün listesinde yok. Eklensin mi?`)
        if (ekle) {
          const b = prompt(`Barkod (boş bırakabilirsiniz):`)
          const {data:yeni} = await supabase.from('urunler').insert({ urun_adi:k.urun_adi, barkod:b||null, liste_fiyati:k.birim_fiyat, birim:'adet', aktif:true }).select().single()
          if (yeni) { guncellenmis[i]={...k,urun_id:yeni.id,barkod:yeni.barkod??''}; setUrunler(p=>[...p,yeni]) }
        }
      }
    }

    const {data:teklif,error:te} = await supabase.from('teklifler').insert({
      musteri_id:musteriId, iskonto_orani:iskontoOrani, ara_toplam:araToplam,
      iskonto_tutar:iskontoTutar, genel_toplam:genelToplam, notlar:notlar||null, tarih,
    }).select().single()

    if(te||!teklif){setSaving(false);alert('Hata: '+te?.message);return}

    await supabase.from('teklif_kalemleri').insert(
      guncellenmis.map((k,i)=>({ teklif_id:teklif.id, urun_id:k.urun_id, urun_adi:k.urun_adi, barkod:k.barkod||null, birim_fiyat:k.birim_fiyat, miktar:k.miktar, toplam:k.toplam, sira:i }))
    )
    setSaving(false); router.push(`/teklifler/${teklif.id}`)
  }

  return (
    <div style={{ maxWidth:800 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, gap:12 }}>
        <h1 style={{ fontSize:22, fontWeight:700, letterSpacing:'-.03em', color:'#111318' }}>Yeni Teklif</h1>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <label className="form-label" style={{ margin:0 }}>Tarih</label>
          <input type="date" value={tarih} max={bugunStr()} onChange={e=>setTarih(e.target.value)} className="form-input" style={{ width:145 }}/>
        </div>
      </div>

      <div className="card" style={{ padding:'20px 24px' }}>
        {/* Müşteri arama */}
        <div style={{ marginBottom:20 }}>
          <label className="form-label">Müşteri</label>
          <div style={{ position:'relative' }}>
            <input
              value={musteriId ? secilenMusteri?.musteri_adi??'' : musteriQ}
              onChange={e=>{if(!musteriId){setMusteriQ(e.target.value);setMusteriOpen(true)}}}
              onFocus={()=>{if(!musteriId)setMusteriOpen(true)}}
              placeholder="Müşteri adı yazın veya seçin..."
              className="form-input"
            />
            {musteriId && (
              <button onClick={()=>{setMusteriId('');setMusteriQ('')}} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#9099A8', cursor:'pointer', fontSize:16 }}>×</button>
            )}
            {musteriOpen && !musteriId && filtMusteriler.length > 0 && (
              <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1.5px solid #E2E5EC', borderRadius:8, boxShadow:'0 8px 24px rgba(0,0,0,.12)', zIndex:20, maxHeight:200, overflowY:'auto', marginTop:2 }}>
                {filtMusteriler.map(m => (
                  <div key={m.id} onClick={()=>{setMusteriId(m.id);setMusteriOpen(false);setMusteriQ('')}}
                    style={{ padding:'10px 14px', cursor:'pointer', fontSize:13, borderBottom:'1px solid #F3F4F6' }}
                    onMouseEnter={e=>(e.currentTarget.style.background='#F9FAFB')}
                    onMouseLeave={e=>(e.currentTarget.style.background='')}>
                    {m.musteri_adi}
                    {m.adres && <div style={{ fontSize:11, color:'#9099A8', marginTop:1 }}>{m.adres}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Ürün arama */}
        <div style={{ marginBottom:16 }}>
          <label className="form-label">Ürün Ekle</label>
          <div style={{ display:'flex', gap:8 }}>
            <div style={{ flex:1, position:'relative' }}>
              <input value={urunQ} onChange={e=>{setUrunQ(e.target.value);setUrunOpen(true)}} onFocus={()=>setUrunOpen(true)}
                placeholder="Ürün adı veya barkod..." className="form-input"/>
              {urunOpen && urunQ && filtUrunler.length > 0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1.5px solid #E2E5EC', borderRadius:8, boxShadow:'0 8px 24px rgba(0,0,0,.12)', zIndex:20, maxHeight:200, overflowY:'auto', marginTop:2 }}>
                  {filtUrunler.map(u => (
                    <div key={u.id} onClick={()=>urunEkle(u)}
                      style={{ padding:'10px 14px', cursor:'pointer', fontSize:13, borderBottom:'1px solid #F3F4F6', display:'flex', justifyContent:'space-between' }}
                      onMouseEnter={e=>(e.currentTarget.style.background='#F9FAFB')}
                      onMouseLeave={e=>(e.currentTarget.style.background='')}>
                      <span>{u.urun_adi} {u.barkod&&<span style={{ color:'#9099A8', fontSize:11 }}>({u.barkod})</span>}</span>
                      <span style={{ fontFamily:'DM Mono,monospace', fontWeight:600 }}>₺{para(u.liste_fiyati)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Barkod ile ekle */}
            <input ref={barkodRef} value={barkod} onChange={e=>setBarkod(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&barkodAra()}
              placeholder="Barkod..." className="form-input" style={{ width:140 }}/>
            <button onClick={barkodAra} className="btn btn-secondary">Ürün Ekle</button>
          </div>
        </div>

        {/* Kalemler */}
        {kalemler.length > 0 && (
          <div style={{ border:'1px solid #E9EBF0', borderRadius:8, overflow:'hidden', marginBottom:16 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead style={{ background:'#F9FAFB' }}>
                <tr>
                  <th style={{ padding:'8px 12px', textAlign:'left', fontWeight:600, fontSize:11, color:'#9099A8', textTransform:'uppercase', letterSpacing:'.04em' }}>Ürün</th>
                  <th style={{ padding:'8px 12px', textAlign:'right', fontWeight:600, fontSize:11, color:'#9099A8', textTransform:'uppercase', letterSpacing:'.04em', width:90 }}>Fiyat</th>
                  <th style={{ padding:'8px 12px', textAlign:'right', fontWeight:600, fontSize:11, color:'#9099A8', textTransform:'uppercase', letterSpacing:'.04em', width:80 }}>Miktar</th>
                  <th style={{ padding:'8px 12px', textAlign:'right', fontWeight:600, fontSize:11, color:'#9099A8', textTransform:'uppercase', letterSpacing:'.04em', width:110 }}>Toplam</th>
                  <th style={{ width:72 }}></th>
                </tr>
              </thead>
              <tbody>
                {kalemler.map((k,i) => (
                  <tr key={i} style={{ borderTop:'1px solid #F3F4F6', background: k.urun_id===null ? '#FFFBEB' : '' }}>
                    <td style={{ padding:'6px 12px' }}>
                      <input type="text" value={k.urun_adi} onChange={e=>kalemGuncelle(i,'urun_adi',e.target.value)}
                        className="form-input" style={{ border:'none', padding:'4px 0', boxShadow:'none', background:'transparent', fontSize:13 }}/>
                      {k.urun_id===null && <div style={{ fontSize:10, color:'#D97706' }}>Yeni ürün olarak kaydedilecek</div>}
                    </td>
                    <td style={{ padding:'6px 12px' }}>
                      <input type="number" value={k.birim_fiyat} min="1" step="1" onChange={e=>kalemGuncelle(i,'birim_fiyat',parseFloat(e.target.value)||0)}
                        className="form-input" style={{ border:'none', padding:'4px 0', boxShadow:'none', background:'transparent', textAlign:'right', fontSize:13 }}/>
                    </td>
                    <td style={{ padding:'6px 12px' }}>
                      <input type="number" value={k.miktar} min="1" step="1" onChange={e=>kalemGuncelle(i,'miktar',parseFloat(e.target.value)||0)}
                        className="form-input" style={{ border:'none', padding:'4px 0', boxShadow:'none', background:'transparent', textAlign:'right', fontSize:13 }}/>
                    </td>
                    <td style={{ padding:'6px 12px', textAlign:'right', fontWeight:600, fontFamily:'DM Mono,monospace' }}>₺{para(k.toplam)}</td>
                    <td style={{ padding:'6px 8px', textAlign:'right' }}>
                      <button onClick={()=>kalemKopyala(i)} title="Kopyala" style={{ background:'none', border:'none', cursor:'pointer', color:'#9099A8', fontSize:14, padding:'2px 4px' }}>⧉</button>
                      <button onClick={()=>setKalemler(p=>p.filter((_,j)=>j!==i))} style={{ background:'none', border:'none', cursor:'pointer', color:'#9099A8', fontSize:16, padding:'2px 4px' }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Toplamlar + iskonto */}
        {kalemler.length > 0 && (
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <div style={{ width:300 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'#5A6072', marginBottom:8 }}>
                <span>Ara toplam</span>
                <span style={{ fontFamily:'DM Mono,monospace', fontWeight:500 }}>₺{para(araToplam)}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <span style={{ fontSize:13, color:'#5A6072', flexShrink:0 }}>İskonto</span>
                <input type="number" value={iskontoVal} min="1" step="1" onChange={e=>setIskontoVal(parseFloat(e.target.value)||0)}
                  className="form-input" style={{ flex:1, padding:'5px 8px', fontSize:13 }}/>
                <div style={{ display:'flex', border:'1.5px solid #E2E5EC', borderRadius:7, overflow:'hidden', flexShrink:0 }}>
                  {(['%','TL'] as const).map(t => (
                    <button key={t} onClick={()=>setIskontoTip(t)}
                      style={{ padding:'4px 10px', fontSize:12, fontWeight:500, cursor:'pointer', border:'none', background:iskontoTip===t?'var(--brand)':'#fff', color:iskontoTip===t?'#fff':'#374151', transition:'all 120ms' }}>
                      {t}
                    </button>
                  ))}
                </div>
                <span style={{ fontSize:13, color:'var(--brand)', fontFamily:'DM Mono,monospace', flexShrink:0 }}>−₺{para(iskontoTutar)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:16, fontWeight:700, color:'#111318', borderTop:'1px solid #E9EBF0', paddingTop:10 }}>
                <span>Genel Toplam</span>
                <span style={{ fontFamily:'DM Mono,monospace', color:'var(--brand)' }}>₺{para(genelToplam)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Notlar */}
        <div style={{ marginTop:20 }}>
          <label className="form-label">Notlar</label>
          <textarea value={notlar} onChange={e=>setNotlar(e.target.value)} rows={2}
            className="form-input" style={{ resize:'none' }} placeholder="Opsiyonel..."/>
        </div>

        <div style={{ display:'flex', gap:10, marginTop:20 }}>
          <button onClick={()=>setOzet(true)} disabled={!musteriId||kalemler.length===0}
            className="btn btn-primary" style={{ flex:1, justifyContent:'center' }}>
            Kaydet ve Önizle
          </button>
          <button onClick={()=>router.back()} className="btn btn-secondary">İptal</button>
        </div>
      </div>

      {/* Özet modal */}
      {ozet && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setOzet(false)}}>
          <div className="modal-box" style={{ maxWidth:420 }}>
            <div style={{ padding:'22px 24px 0' }}>
              <h2 style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>Teklif Özeti</h2>
              <div style={{ display:'flex', flexDirection:'column', gap:8, fontSize:13 }}>
                <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'#9099A8' }}>Müşteri</span><span style={{ fontWeight:500 }}>{secilenMusteri?.musteri_adi}</span></div>
                <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'#9099A8' }}>Kalem sayısı</span><span style={{ fontWeight:500 }}>{kalemler.length}</span></div>
                <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'#9099A8' }}>Ara toplam</span><span style={{ fontFamily:'DM Mono,monospace' }}>₺{para(araToplam)}</span></div>
                {iskontoTutar>0 && <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'#9099A8' }}>İskonto</span><span style={{ color:'var(--brand)', fontFamily:'DM Mono,monospace' }}>−₺{para(iskontoTutar)}</span></div>}
                <div style={{ display:'flex', justifyContent:'space-between', fontWeight:700, fontSize:16, borderTop:'1px solid #E9EBF0', paddingTop:10, marginTop:4 }}>
                  <span>Genel Toplam</span>
                  <span style={{ fontFamily:'DM Mono,monospace', color:'var(--brand)' }}>₺{para(genelToplam)}</span>
                </div>
              </div>
            </div>
            <div style={{ padding:'20px 24px', display:'flex', gap:10 }}>
              <button onClick={kaydet} disabled={saving} className="btn btn-primary" style={{ flex:1, justifyContent:'center' }}>
                {saving?'Kaydediliyor...':'Onayla ve Kaydet'}
              </button>
              <button onClick={()=>setOzet(false)} className="btn btn-secondary" style={{ flex:1, justifyContent:'center' }}>Geri Dön</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
