'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { para, tarih, tahsilatTuruLabel } from '@/lib/format'
import TahsilatEkleModal from './TahsilatEkleModal'

type Tahsilat = { id:string; tahsilat_no:number; tutar:number; tarih:string; iptal:boolean; tahsilat_turu:string; musteriler:{musteri_adi:string}|null }

const HIZLI_TARIH = [
  { label:'Bugün',    days:0 },
  { label:'Bu Hafta', days:7 },
  { label:'Bu Ay',    days:30 },
]

export default function TahsilatlarClient({ tahsilatlar, musteriler, autoAcik }: { tahsilatlar:Tahsilat[]; musteriler:any[]; autoAcik?:boolean }) {
  const [q, setQ]         = useState('')
  const [iptal, setIptal] = useState('aktif')
  const [tur, setTur]     = useState('')
  const [bas, setBas]     = useState('')
  const [bit, setBit]     = useState('')
  const bugun = new Date().toISOString().split('T')[0]

  const hizliSec = (days:number) => {
    const b = new Date(); b.setDate(b.getDate()-days)
    setBas(b.toISOString().split('T')[0]); setBit(bugun)
  }

  const list = useMemo(() => {
    let l = [...tahsilatlar]
    if(q)   l = l.filter(t => t.musteriler?.musteri_adi?.toLowerCase().includes(q.toLowerCase()) || String(t.tahsilat_no).includes(q))
    if(iptal==='aktif') l = l.filter(t=>!t.iptal)
    if(iptal==='iptal') l = l.filter(t=>t.iptal)
    if(tur)  l = l.filter(t=>t.tahsilat_turu===tur)
    if(bas)  l = l.filter(t=>t.tarih>=bas)
    if(bit)  l = l.filter(t=>t.tarih.slice(0,10)<=bit)
    return l.sort((a,b)=>new Date(b.tarih).getTime()-new Date(a.tarih).getTime())
  },[tahsilatlar,q,iptal,tur,bas,bit])

  const toplam = list.filter(t=>!t.iptal).reduce((s,t)=>s+t.tutar,0)

  return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, gap:12, flexWrap:'wrap' }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, letterSpacing:'-.03em', color:'#111318', marginBottom:4 }}>Tahsilatlar</h1>
          <p style={{ fontSize:13, color:'#9099A8' }}>{list.length} kayıt · <span style={{ fontWeight:600, color:'#15803D' }}>₺{para(toplam)}</span></p>
        </div>
        <TahsilatEkleModal musteriler={musteriler} autoAcik={autoAcik} />
      </div>

      <div className="filter-bar">
        <div className="search-input" style={{ flex:'1', minWidth:180, maxWidth:260 }}>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Müşteri ara..." className="form-input"/>
        </div>
        <select value={iptal} onChange={e=>setIptal(e.target.value)} className="form-input" style={{ width:120 }}>
          <option value="">Tümü</option>
          <option value="aktif">Aktif</option>
          <option value="iptal">İptal</option>
        </select>
        <select value={tur} onChange={e=>setTur(e.target.value)} className="form-input" style={{ width:130 }}>
          <option value="">Tüm türler</option>
          <option value="nakit">Nakit</option>
          <option value="eft_havale">EFT/Havale</option>
          <option value="cek">Çek</option>
          <option value="senet">Senet</option>
          <option value="diger">Diğer</option>
        </select>
        <div style={{ display:'flex', gap:4 }}>
          {HIZLI_TARIH.map(h => (
            <button key={h.label} onClick={()=>hizliSec(h.days)} className="btn btn-secondary btn-sm">{h.label}</button>
          ))}
        </div>
        <input type="date" value={bas} max={bugun} onChange={e=>setBas(e.target.value)} className="form-input" style={{ width:140 }}/>
        <span style={{ color:'#9099A8', fontSize:12 }}>—</span>
        <input type="date" value={bit} max={bugun} onChange={e=>setBit(e.target.value)} className="form-input" style={{ width:140 }}/>
        {(q||tur||bas||bit||iptal!=='aktif') && <button className="btn btn-ghost btn-sm" onClick={()=>{setQ('');setTur('');setBas('');setBit('');setIptal('aktif')}}>× Temizle</button>}
      </div>

      {/* Desktop */}
      <div className="hide-mobile card" style={{ overflowX:'auto' }}>
        <table className="data-table">
          <thead><tr>
            <th>No</th><th>Müşteri</th><th>Tür</th><th>Tarih</th>
            <th style={{ textAlign:'right' }}>Tutar</th>
            <th style={{ textAlign:'right' }}>Durum</th>
            <th></th>
          </tr></thead>
          <tbody>
            {list.map(t => (
              <tr key={t.id} style={{ opacity:t.iptal?.5:1 }}>
                <td style={{ fontFamily:'DM Mono,monospace', fontSize:12, color:'#9099A8' }}>{t.tahsilat_no}</td>
                <td style={{ fontWeight:500 }}>{t.musteriler?.musteri_adi??'-'}</td>
                <td><span className="badge badge-blue">{tahsilatTuruLabel[t.tahsilat_turu]??t.tahsilat_turu}</span></td>
                <td style={{ color:'#9099A8' }}>{tarih(t.tarih)}</td>
                <td style={{ textAlign:'right', fontFamily:'DM Mono,monospace', fontSize:13, fontWeight:600, color:t.iptal?'#9099A8':'#15803D', textDecoration:t.iptal?'line-through':'none' }}>₺{para(t.tutar)}</td>
                <td style={{ textAlign:'right' }}><span className={`badge ${t.iptal?'badge-red':'badge-green'}`}>{t.iptal?'İptal':'Aktif'}</span></td>
                <td style={{ textAlign:'right' }}><Link href={`/tahsilatlar/${t.id}`} className="btn btn-ghost btn-sm">Detay →</Link></td>
              </tr>
            ))}
            {list.length===0 && <tr><td colSpan={7} style={{ textAlign:'center', color:'#9099A8', padding:'48px 0', fontSize:13 }}>Sonuç bulunamadı</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Mobil */}
      <div className="show-mobile" style={{ display:'none', flexDirection:'column', gap:10 }}>
        {list.map(t => (
          <Link key={t.id} href={`/tahsilatlar/${t.id}`} style={{ textDecoration:'none' }}>
            <div className="mobile-card" style={{ opacity:t.iptal?.5:1 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:14, color:'#111318' }}>{t.musteriler?.musteri_adi??'-'}</div>
                  <div style={{ fontSize:12, color:'#9099A8', marginTop:2 }}>
                    #{t.tahsilat_no} · {tarih(t.tarih)} · <span className="badge badge-blue" style={{ fontSize:10 }}>{tahsilatTuruLabel[t.tahsilat_turu]??t.tahsilat_turu}</span>
                  </div>
                </div>
                <span className={`badge ${t.iptal?'badge-red':'badge-green'}`}>{t.iptal?'İptal':'Aktif'}</span>
              </div>
              <div style={{ fontSize:18, fontWeight:700, fontFamily:'DM Mono,monospace', color:t.iptal?'#9099A8':'#15803D', textDecoration:t.iptal?'line-through':'none' }}>
                +₺{para(t.tutar)}
              </div>
            </div>
          </Link>
        ))}
        {list.length===0 && <div style={{ textAlign:'center', color:'#9099A8', padding:'48px 0', fontSize:13 }}>Sonuç bulunamadı</div>}
      </div>
    </div>
  )
}
