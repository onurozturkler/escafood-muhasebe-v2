'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { para, tarih } from '@/lib/format'

type Teklif = { id:string; teklif_no:number; genel_toplam:number; durum:string; tarih:string; musteriler:{musteri_adi:string}|null }

export default function TekliflerClient({ teklifler }: { teklifler: Teklif[] }) {
  const [q, setQ]           = useState('')
  const [durum, setDurum]   = useState('')
  const [bas, setBas]       = useState('')
  const [bit, setBit]       = useState('')
  const [sort, setSort]     = useState<'tarih'|'teklif_no'|'genel_toplam'|'musteri'>('tarih')
  const [dir, setDir]       = useState<'asc'|'desc'>('desc')

  const bugun = new Date().toISOString().split('T')[0]
  const toggleSort = (k: typeof sort) => { if(sort===k) setDir(d=>d==='asc'?'desc':'asc'); else{setSort(k);setDir('asc')} }
  const SortIco = ({k}:{k:typeof sort}) => <span style={{marginLeft:3,fontSize:10,opacity:sort===k?1:.3}}>{sort===k?(dir==='asc'?'▲':'▼'):'⇅'}</span>

  const list = useMemo(() => {
    let l = [...teklifler]
    if(q)     l = l.filter(t => t.musteriler?.musteri_adi?.toLowerCase().includes(q.toLowerCase()) || String(t.teklif_no).includes(q))
    if(durum) l = l.filter(t => t.durum === durum)
    if(bas)   l = l.filter(t => t.tarih >= bas)
    if(bit)   l = l.filter(t => t.tarih.slice(0,10) <= bit)
    l.sort((a,b) => {
      const va = sort==='musteri' ? a.musteriler?.musteri_adi??'' : sort==='teklif_no' ? a.teklif_no : sort==='genel_toplam' ? a.genel_toplam : a.tarih
      const vb = sort==='musteri' ? b.musteriler?.musteri_adi??'' : sort==='teklif_no' ? b.teklif_no : sort==='genel_toplam' ? b.genel_toplam : b.tarih
      if(va<vb) return dir==='asc'?-1:1; if(va>vb) return dir==='asc'?1:-1; return 0
    })
    return l
  }, [teklifler,q,durum,bas,bit,sort,dir])

  const aktifToplam = list.filter(t=>t.durum==='aktif').reduce((s,t)=>s+t.genel_toplam,0)

  return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, gap:12, flexWrap:'wrap' }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, letterSpacing:'-.03em', color:'#111318', marginBottom:4 }}>Teklifler</h1>
          <p style={{ fontSize:13, color:'#9099A8' }}>{list.length} teklif · aktif: <span style={{ fontWeight:600, color:'#111318' }}>₺{para(aktifToplam)}</span></p>
        </div>
        <Link href="/teklifler/yeni" className="btn btn-primary">+ Yeni Teklif</Link>
      </div>

      {/* Filtreler */}
      <div className="filter-bar">
        <div className="search-input" style={{ flex:'1', minWidth:200, maxWidth:300 }}>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Müşteri veya no ara..." className="form-input" />
        </div>
        <select value={durum} onChange={e=>setDurum(e.target.value)} className="form-input" style={{ width:140 }}>
          <option value="">Tüm durumlar</option>
          <option value="aktif">Aktif</option>
          <option value="iptal">İptal</option>
          <option value="onaylandi">Onaylandı</option>
        </select>
        <input type="date" value={bas} max={bugun} onChange={e=>setBas(e.target.value)} className="form-input" style={{ width:145 }} />
        <span style={{ color:'#9099A8', fontSize:12 }}>—</span>
        <input type="date" value={bit} max={bugun} onChange={e=>setBit(e.target.value)} className="form-input" style={{ width:145 }} />
        {(q||durum||bas||bit) && (
          <button className="btn btn-ghost btn-sm" onClick={()=>{setQ('');setDurum('');setBas('');setBit('')}}>× Temizle</button>
        )}
      </div>

      {/* Desktop tablo */}
      <div className="hide-mobile card" style={{ overflowX:'auto' }}>
        <table className="data-table">
          <thead><tr>
            <th onClick={()=>toggleSort('teklif_no')} style={{ cursor:'pointer' }}>No <SortIco k="teklif_no"/></th>
            <th onClick={()=>toggleSort('musteri')} style={{ cursor:'pointer' }}>Müşteri <SortIco k="musteri"/></th>
            <th onClick={()=>toggleSort('tarih')} style={{ cursor:'pointer' }}>Tarih <SortIco k="tarih"/></th>
            <th onClick={()=>toggleSort('genel_toplam')} style={{ cursor:'pointer', textAlign:'right' }}>Tutar <SortIco k="genel_toplam"/></th>
            <th style={{ textAlign:'right' }}>Durum</th>
            <th></th>
          </tr></thead>
          <tbody>
            {list.map(t => (
              <tr key={t.id}>
                <td style={{ fontFamily:'DM Mono,monospace', fontSize:12, color:'#9099A8' }}>#{t.teklif_no}</td>
                <td style={{ fontWeight:500 }}>{t.musteriler?.musteri_adi??'-'}</td>
                <td style={{ color:'#9099A8' }}>{new Date(t.tarih).toLocaleDateString('tr-TR')}</td>
                <td style={{ textAlign:'right', fontFamily:'DM Mono,monospace', fontSize:13, fontWeight:600, textDecoration:t.durum==='iptal'?'line-through':'none', color:t.durum==='iptal'?'#9099A8':'#111318' }}>₺{para(t.genel_toplam)}</td>
                <td style={{ textAlign:'right' }}>
                  <span className={`badge ${t.durum==='aktif'?'badge-green':t.durum==='iptal'?'badge-red':'badge-blue'}`}>
                    {t.durum==='aktif'?'Aktif':t.durum==='iptal'?'İptal':'Onaylandı'}
                  </span>
                </td>
                <td style={{ textAlign:'right' }}><Link href={`/teklifler/${t.id}`} className="btn btn-ghost btn-sm">Detay →</Link></td>
              </tr>
            ))}
            {list.length===0 && <tr><td colSpan={6} style={{ textAlign:'center', color:'#9099A8', padding:'48px 0', fontSize:13 }}>Sonuç bulunamadı</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Mobil kartlar */}
      <div className="show-mobile" style={{ display:'none', flexDirection:'column', gap:10 }}>
        {list.map(t => (
          <Link key={t.id} href={`/teklifler/${t.id}`} style={{ textDecoration:'none' }}>
            <div className="mobile-card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:14, color:'#111318' }}>{t.musteriler?.musteri_adi??'-'}</div>
                  <div style={{ fontSize:12, color:'#9099A8', marginTop:2 }}>#{t.teklif_no} · {new Date(t.tarih).toLocaleDateString('tr-TR')}</div>
                </div>
                <span className={`badge ${t.durum==='aktif'?'badge-green':t.durum==='iptal'?'badge-red':'badge-blue'}`}>
                  {t.durum==='aktif'?'Aktif':t.durum==='iptal'?'İptal':'Onaylandı'}
                </span>
              </div>
              <div style={{ fontSize:18, fontWeight:700, fontFamily:'DM Mono,monospace', color:t.durum==='iptal'?'#9099A8':'var(--brand)', textDecoration:t.durum==='iptal'?'line-through':'none' }}>
                ₺{para(t.genel_toplam)}
              </div>
            </div>
          </Link>
        ))}
        {list.length===0 && <div style={{ textAlign:'center', color:'#9099A8', padding:'48px 0', fontSize:13 }}>Sonuç bulunamadı</div>}
      </div>
    </div>
  )
}
