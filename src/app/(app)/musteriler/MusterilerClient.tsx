'use client'
import { useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { para } from '@/lib/format'
import * as XLSX from 'xlsx'
import SifreOnay from '@/components/SifreOnay'

type Musteri = {
  id: string; musteri_adi: string; adres: string | null
  telefon: string | null; toplam_borc: number; toplam_tahsilat: number; bakiye: number
}
type SortKey = 'musteri_adi' | 'toplam_borc' | 'toplam_tahsilat' | 'bakiye'

export default function MusterilerClient({ musteriler: init }: { musteriler: Musteri[] }) {
  const router    = useRouter()
  const importRef = useRef<HTMLInputElement>(null)

  const [list, setList]         = useState<Musteri[]>(init)
  const [secili, setSecili]     = useState<Set<string>>(new Set())
  const [q, setQ]               = useState('')
  const [bakiyeFiltre, setBakiyeFiltre] = useState<'hepsi'|'borc'|'alacak'|'sifir'>('hepsi')
  const [sortKey, setSortKey]   = useState<SortKey>('musteri_adi')
  const [sortDir, setSortDir]   = useState<'asc'|'desc'>('asc')
  const [silModal, setSilModal] = useState<string[]>([])
  const [sifreModal, setSifreModal] = useState(false)
  const [silYukleniyor, setSilYukleniyor] = useState(false)

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir(k === 'musteri_adi' ? 'asc' : 'desc') }
  }
  const SortIco = ({ k }: { k: SortKey }) => (
    <span style={{ marginLeft: 3, fontSize: 10, opacity: sortKey === k ? 1 : .3 }}>
      {sortKey === k ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  )

  const filtered = useMemo(() => {
    let l = [...list]
    if (q) l = l.filter(m => m.musteri_adi.toLowerCase().includes(q.toLowerCase()) || (m.adres ?? '').toLowerCase().includes(q.toLowerCase()) || (m.telefon ?? '').includes(q))
    if (bakiyeFiltre === 'borc')   l = l.filter(m => m.bakiye > 0)
    if (bakiyeFiltre === 'alacak') l = l.filter(m => m.bakiye < 0)
    if (bakiyeFiltre === 'sifir')  l = l.filter(m => m.bakiye === 0)
    l.sort((a, b) => {
      const va = a[sortKey] ?? '', vb = b[sortKey] ?? ''
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ?  1 : -1
      return 0
    })
    return l
  }, [list, q, bakiyeFiltre, sortKey, sortDir])

  const hepsiniSec = () => {
    if (secili.size === filtered.length) setSecili(new Set())
    else setSecili(new Set(filtered.map(m => m.id)))
  }
  const togSec = (id: string) => {
    const s = new Set(secili); s.has(id) ? s.delete(id) : s.add(id); setSecili(s)
  }

  const sil = async (ids: string[]) => {
    setSilYukleniyor(true)
    const supabase = createClient()
    const [{ count: t }, { count: th }] = await Promise.all([
      supabase.from('teklifler').select('id', { count: 'exact', head: true }).in('musteri_id', ids),
      supabase.from('tahsilatlar').select('id', { count: 'exact', head: true }).in('musteri_id', ids),
    ])
    if ((t ?? 0) > 0 || (th ?? 0) > 0) {
      setSilYukleniyor(false)
      const msg = [t ? `${t} teklif` : '', th ? `${th} tahsilat` : ''].filter(Boolean).join(' ve ')
      alert(`Bu müşteriye ait ${msg} bulunuyor. Önce ilgili kayıtları silmeniz gerekiyor.`)
      setSilModal([]); return
    }
    const { error } = await supabase.from('musteriler').delete().in('id', ids)
    setSilYukleniyor(false)
    if (error) { alert('Hata: ' + error.message); return }
    setList(p => p.filter(m => !ids.includes(m.id)))
    setSecili(new Set()); setSilModal([])
  }

  const excelExport = () => {
    const rows = filtered.map(m => ({
      'Müşteri Adı':    m.musteri_adi,
      'Adres':          m.adres ?? '',
      'Toplam Borç':    m.toplam_borc,
      'Tahsilat':       m.toplam_tahsilat,
      'Bakiye':         m.bakiye,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Müşteriler')
    XLSX.writeFile(wb, `Musteriler_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.xlsx`)
  }

  const excelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      const wb = XLSX.read(new Uint8Array(ev.target?.result as ArrayBuffer), { type: 'array' })
      const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])
      if (!rows.length) return
      const supabase = createClient()
      const kayitlar = rows.map(r => ({
        musteri_adi:      r['Müşteri Adı'] || r['musteri_adi'] || '',
        adres:            r['Adres'] || r['adres'] || null,
        telefon:          r['Telefon'] || r['telefon'] || null,
        email:            r['E-posta'] || r['email'] || null,
        acilis_bakiyesi:  parseFloat(r['Açılış Bakiyesi'] || r['acilis_bakiyesi'] || 0) || 0,
      })).filter(k => k.musteri_adi)
      const { error } = await supabase.from('musteriler').insert(kayitlar)
      if (error) { alert('İçe aktarma hatası: ' + error.message); return }
      router.refresh()
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  const toplamBakiye = filtered.reduce((s, m) => s + (m.bakiye ?? 0), 0)

  return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, gap:12, flexWrap:'wrap' }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, letterSpacing:'-.03em', color:'#111318', marginBottom:4 }}>Müşteriler</h1>
          <p style={{ fontSize:13, color:'#9099A8' }}>
            {filtered.length} müşteri · açık bakiye:{' '}
            <span style={{ fontWeight:600, color: toplamBakiye > 0 ? 'var(--brand)' : '#15803D' }}>₺{para(toplamBakiye)}</span>
          </p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {secili.size > 0 && (
            <button className="btn btn-danger btn-sm" onClick={() => setSilModal([...secili])}>
              Seçilenleri Sil ({secili.size})
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={excelExport}>Excel İndir</button>
          <button className="btn btn-secondary btn-sm" onClick={() => importRef.current?.click()}>Excel Yükle</button>
          <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" style={{ display:'none' }} onChange={excelImport} />
          <Link href="/musteriler/yeni" className="btn btn-primary">+ Yeni Müşteri</Link>
        </div>
      </div>

      {/* Filtreler */}
      <div className="filter-bar">
        <div className="search-input" style={{ flex:1, minWidth:200, maxWidth:320 }}>
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Ad, adres veya telefon ara..." className="form-input" />
        </div>
        <div style={{ display:'flex', gap:4 }}>
          {([
            { val:'hepsi',  label:'Tümü' },
            { val:'borc',   label:'Borçlu' },
            { val:'alacak', label:'Alacaklı' },
            { val:'sifir',  label:'Sıfır' },
          ] as const).map(f => (
            <button key={f.val} onClick={() => setBakiyeFiltre(f.val)}
              className={`btn btn-sm ${bakiyeFiltre === f.val ? 'btn-primary' : 'btn-secondary'}`}>
              {f.label}
            </button>
          ))}
        </div>
        {(q || bakiyeFiltre !== 'hepsi') && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setQ(''); setBakiyeFiltre('hepsi') }}>× Temizle</button>
        )}
      </div>

      {/* Desktop tablo */}
      <div className="hide-mobile card" style={{ overflowX:'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width:40 }}>
                <input type="checkbox" checked={secili.size === filtered.length && filtered.length > 0} onChange={hepsiniSec} />
              </th>
              <th onClick={() => toggleSort('musteri_adi')} style={{ cursor:'pointer' }}>
                Müşteri <SortIco k="musteri_adi" />
              </th>
              <th onClick={() => toggleSort('toplam_borc')} style={{ cursor:'pointer', textAlign:'right' }}>
                Toplam Borç <SortIco k="toplam_borc" />
              </th>
              <th onClick={() => toggleSort('toplam_tahsilat')} style={{ cursor:'pointer', textAlign:'right' }}>
                Tahsilat <SortIco k="toplam_tahsilat" />
              </th>
              <th onClick={() => toggleSort('bakiye')} style={{ cursor:'pointer', textAlign:'right' }}>
                Bakiye <SortIco k="bakiye" />
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => (
              <tr key={m.id}>
                <td><input type="checkbox" checked={secili.has(m.id)} onChange={() => togSec(m.id)} /></td>
                <td>
                  <div style={{ fontWeight:500 }}>{m.musteri_adi}</div>
                  {m.adres && <div style={{ fontSize:12, color:'#9099A8', marginTop:2 }}>{m.adres}</div>}
                  {m.telefon && <div style={{ fontSize:11, color:'#BCC1CB' }}>{m.telefon}</div>}
                </td>
                <td style={{ textAlign:'right', fontFamily:'DM Mono,monospace', fontSize:13 }}>₺{para(m.toplam_borc)}</td>
                <td style={{ textAlign:'right', fontFamily:'DM Mono,monospace', fontSize:13, color:'#15803D' }}>₺{para(m.toplam_tahsilat)}</td>
                <td style={{ textAlign:'right', fontFamily:'DM Mono,monospace', fontSize:13, fontWeight:600,
                  color:(m.bakiye??0)>0?'var(--brand)':(m.bakiye??0)<0?'#15803D':'#9099A8' }}>
                  ₺{para(m.bakiye)}
                </td>
                <td style={{ textAlign:'right' }}>
                  <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                    <Link href={`/musteriler/${m.id}`} className="btn btn-ghost btn-xs">Ekstre</Link>
                    <button className="btn btn-danger btn-xs" onClick={() => setSilModal([m.id])}>Sil</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign:'center', color:'#9099A8', padding:'48px 0', fontSize:13 }}>Kayıt bulunamadı</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobil kartlar */}
      <div className="show-mobile" style={{ display:'none', flexDirection:'column', gap:10 }}>
        {filtered.map(m => (
          <div key={m.id} className="mobile-card">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
              <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                <input type="checkbox" checked={secili.has(m.id)} onChange={() => togSec(m.id)} style={{ marginTop:3 }} />
                <div>
                  <div style={{ fontWeight:600, fontSize:14 }}>{m.musteri_adi}</div>
                  {m.adres && <div style={{ fontSize:12, color:'#9099A8' }}>{m.adres}</div>}
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:16, fontWeight:700, fontFamily:'DM Mono,monospace',
                  color:(m.bakiye??0)>0?'var(--brand)':(m.bakiye??0)<0?'#15803D':'#9099A8' }}>
                  ₺{para(m.bakiye)}
                </div>
                <div style={{ fontSize:11, color:'#9099A8' }}>bakiye</div>
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <Link href={`/musteriler/${m.id}`} className="btn btn-ghost btn-xs">Ekstre</Link>
              <button className="btn btn-danger btn-xs" onClick={() => setSilModal([m.id])}>Sil</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign:'center', color:'#9099A8', padding:'48px 0', fontSize:13 }}>Kayıt bulunamadı</div>
        )}
      </div>

      {/* Silme onay modalı */}
      {silModal.length > 0 && !sifreModal && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) setSilModal([]) }}>
          <div className="modal-box" style={{ maxWidth:380 }}>
            <div style={{ padding:'24px 24px 0' }}>
              <h2 style={{ fontSize:16, fontWeight:700, marginBottom:10 }}>Müşteri Silinecek</h2>
              <p style={{ fontSize:13, color:'#5A6072', lineHeight:1.6 }}>
                {silModal.length === 1
                  ? `"${list.find(m => m.id === silModal[0])?.musteri_adi}" silinecek.`
                  : `${silModal.length} müşteri silinecek.`}
                {' '}Bu işlem geri alınamaz.
              </p>
            </div>
            <div style={{ padding:'20px 24px', display:'flex', gap:10 }}>
              <button onClick={() => setSifreModal(true)} className="btn btn-danger" style={{ flex:1, justifyContent:'center' }}>
                Devam Et →
              </button>
              <button onClick={() => setSilModal([])} className="btn btn-secondary" style={{ flex:1, justifyContent:'center' }}>İptal</button>
            </div>
          </div>
        </div>
      )}

      {sifreModal && (
        <SifreOnay
          baslik="Silme İşlemini Onayla"
          mesaj={`${silModal.length === 1
            ? `"${list.find(m => m.id === silModal[0])?.musteri_adi}" müşterisi`
            : `${silModal.length} müşteri`} kalıcı olarak silinecek.`}
          onOnay={() => { setSifreModal(false); sil(silModal) }}
          onIptal={() => setSifreModal(false)}
        />
      )}
    </div>
  )
}
