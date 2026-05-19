'use client'
import { useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { para } from '@/lib/format'
import * as XLSX from 'xlsx'
import UrunYonet from './UrunYonet'
import ExcelImport from './ExcelImport'

type Urun = { id:string; urun_adi:string; barkod:string|null; liste_fiyati:number; birim:string; aktif:boolean }

export default function UrunlerClient({ urunler: init }: { urunler: Urun[] }) {
  const router = useRouter()
  const [list, setList]       = useState<Urun[]>(init)
  const [secili, setSecili]   = useState<Set<string>>(new Set())
  const [q, setQ]             = useState('')
  const [silModal, setSilModal] = useState<string[]>([])
  const [silYukleniyor, setSilYukleniyor] = useState(false)

  const filtered = useMemo(() =>
    list.filter(u => u.urun_adi.toLowerCase().includes(q.toLowerCase()) || (u.barkod??'').includes(q)),
    [list, q]
  )

  const hepsiniSec = () => {
    if (secili.size===filtered.length) setSecili(new Set())
    else setSecili(new Set(filtered.map(u=>u.id)))
  }

  const togSec = (id:string) => {
    const s = new Set(secili); s.has(id)?s.delete(id):s.add(id); setSecili(s)
  }

  const sil = async (ids:string[]) => {
    setSilYukleniyor(true)
    const { error } = await createClient().from('urunler').delete().in('id', ids)
    setSilYukleniyor(false)
    if (error) { alert('Hata: '+error.message); return }
    setList(p=>p.filter(u=>!ids.includes(u.id)))
    setSecili(new Set()); setSilModal([])
  }

  const excelExport = () => {
    const rows = filtered.map(u => ({
      'Ürün Adı':    u.urun_adi,
      'Barkod':      u.barkod ?? '',
      'Liste Fiyatı':u.liste_fiyati,
      'Birim':       u.birim,
      'Durum':       u.aktif ? 'Aktif' : 'Pasif',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Ürünler')
    XLSX.writeFile(wb, `Urunler_${new Date().toLocaleDateString('tr-TR').replace(/\./g,'-')}.xlsx`)
  }

  return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, gap:12, flexWrap:'wrap' }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, letterSpacing:'-.03em', color:'#111318', marginBottom:4 }}>Ürünler</h1>
          <p style={{ fontSize:13, color:'#9099A8' }}>{filtered.length} ürün</p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {secili.size>0 && (
            <button className="btn btn-danger btn-sm" onClick={()=>setSilModal([...secili])}>
              Seçilenleri Sil ({secili.size})
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={excelExport}>Excel İndir</button>
          <ExcelImport />
          <UrunYonet mod="ekle" />
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-input" style={{ flex:1, minWidth:200, maxWidth:320 }}>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Ürün adı veya barkod..." className="form-input" />
        </div>
        {q && <button className="btn btn-ghost btn-sm" onClick={()=>setQ('')}>× Temizle</button>}
      </div>

      <div className="hide-mobile card" style={{ overflowX:'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width:40 }}>
                <input type="checkbox" checked={secili.size===filtered.length&&filtered.length>0} onChange={hepsiniSec} />
              </th>
              <th>Ürün Adı</th><th>Barkod</th>
              <th style={{ textAlign:'right' }}>Liste Fiyatı</th>
              <th>Birim</th><th style={{ textAlign:'center' }}>Durum</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id}>
                <td><input type="checkbox" checked={secili.has(u.id)} onChange={()=>togSec(u.id)} /></td>
                <td style={{ fontWeight:500 }}>{u.urun_adi}</td>
                <td style={{ fontFamily:'DM Mono,monospace', fontSize:12, color:'#9099A8' }}>{u.barkod??'-'}</td>
                <td style={{ textAlign:'right', fontFamily:'DM Mono,monospace', fontSize:13, fontWeight:600 }}>₺{para(u.liste_fiyati)}</td>
                <td style={{ color:'#9099A8' }}>{u.birim}</td>
                <td style={{ textAlign:'center' }}>
                  <span className={`badge ${u.aktif?'badge-green':'badge-gray'}`}>{u.aktif?'Aktif':'Pasif'}</span>
                </td>
                <td style={{ textAlign:'right' }}>
                  <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                    <UrunYonet mod="duzenle" urun={u as any} />
                    <button className="btn btn-danger btn-xs" onClick={()=>setSilModal([u.id])}>Sil</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length===0 && <tr><td colSpan={7} style={{ textAlign:'center', color:'#9099A8', padding:'48px 0' }}>Kayıt yok</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Mobil kartlar */}
      <div className="show-mobile" style={{ display:'none', flexDirection:'column', gap:10 }}>
        {filtered.map(u => (
          <div key={u.id} className="mobile-card">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
              <div style={{ display:'flex', gap:8 }}>
                <input type="checkbox" checked={secili.has(u.id)} onChange={()=>togSec(u.id)} style={{ marginTop:3 }} />
                <div>
                  <div style={{ fontWeight:600, fontSize:14 }}>{u.urun_adi}</div>
                  <div style={{ fontSize:12, color:'#9099A8' }}>{u.barkod??'-'} · {u.birim}</div>
                </div>
              </div>
              <div style={{ fontSize:16, fontWeight:700, fontFamily:'DM Mono,monospace' }}>₺{para(u.liste_fiyati)}</div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <UrunYonet mod="duzenle" urun={u as any} />
              <button className="btn btn-danger btn-xs" onClick={()=>setSilModal([u.id])}>Sil</button>
            </div>
          </div>
        ))}
      </div>

      {silModal.length>0 && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setSilModal([])}}>
          <div className="modal-box" style={{ maxWidth:380 }}>
            <div style={{ padding:'24px 24px 0' }}>
              <h2 style={{ fontSize:16, fontWeight:700, marginBottom:10 }}>Ürün Silinecek</h2>
              <p style={{ fontSize:13, color:'#5A6072', lineHeight:1.6 }}>
                {silModal.length===1
                  ? `"${list.find(u=>u.id===silModal[0])?.urun_adi}" silinecek.`
                  : `${silModal.length} ürün silinecek.`}
                {' '}Bu işlem geri alınamaz.
              </p>
            </div>
            <div style={{ padding:'20px 24px', display:'flex', gap:10 }}>
              <button onClick={()=>sil(silModal)} disabled={silYukleniyor} className="btn btn-danger" style={{ flex:1, justifyContent:'center' }}>
                {silYukleniyor?'Siliniyor...':'Evet, Sil'}
              </button>
              <button onClick={()=>setSilModal([])} className="btn btn-secondary" style={{ flex:1, justifyContent:'center' }}>İptal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
