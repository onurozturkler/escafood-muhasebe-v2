'use client'

import Link from 'next/link'
import { tarih, para } from '@/lib/format'

type Stat = { label: string; value: string; cls: string }
type Hareket = {
  id: string; tip: 'teklif' | 'tahsilat'; baslik: string
  musteri: string; tutar: number; tarih: string; durum: string; href: string
}

const quickActions = [
  { href: '/teklifler/yeni', icon: '📄', label: 'Yeni Teklif' },
  { href: '/tahsilatlar/yeni', icon: '💰', label: 'Yeni Tahsilat' },
  { href: '/musteriler',     icon: '👤', label: 'Yeni Müşteri' },
  { href: '/urunler',        icon: '📦', label: 'Yeni Ürün' },
]

export default function DashboardClient({ stats, sonHareketler }: { stats: Stat[]; sonHareketler: Hareket[] }) {
  return (
    <div>
      <style>{`
        .hareket-row { transition: background 80ms; }
        .hareket-row:hover { background: #FAFBFC !important; }
        @media(max-width:640px){ .dashboard-two-col { grid-template-columns: 1fr !important; } }
      `}</style>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.03em', color: '#111318', marginBottom: 4 }}>Özet</h1>
        <p style={{ fontSize: 13, color: '#9099A8' }}>
          {new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className={`stat-value ${s.cls}`} style={{ fontSize: 20 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Hızlı işlemler */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#111318', marginBottom: 14 }}>Hızlı İşlem</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {quickActions.map(a => (
              <Link key={a.href} href={a.href} className="quick-btn">
                <span className="quick-btn-icon">{a.icon}</span>
                <span className="quick-btn-label">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Son hareketler */}
        <div className="card">
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #ECEEF2', fontWeight: 600, fontSize: 14, color: '#111318' }}>
            Son Hareketler
          </div>
          {sonHareketler.length === 0 ? (
            <div style={{ padding: '28px 18px', textAlign: 'center', color: '#9099A8', fontSize: 13 }}>Henüz hareket yok</div>
          ) : (
            sonHareketler.map(h => (
              <Link key={h.id} href={h.href} style={{ display: 'block', textDecoration: 'none' }}>
                <div className="hareket-row" style={{ padding: '10px 18px', borderBottom: '1px solid #F5F6FA', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: h.tip === 'teklif' ? '#FFF7ED' : '#EDFAF3',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                  }}>
                    {h.tip === 'teklif' ? '📄' : '💰'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#111318', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {h.musteri}
                    </div>
                    <div style={{ fontSize: 11, color: '#9099A8', marginTop: 1 }}>
                      {h.baslik} · {tarih(h.tarih)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: h.tip === 'teklif' ? 'var(--brand)' : '#15803D' }}>
                      {h.tip === 'teklif' ? '-' : '+'}₺{para(h.tutar)}
                    </div>
                    <span className={`badge ${h.durum === 'aktif' ? 'badge-green' : 'badge-red'}`} style={{ marginTop: 3 }}>
                      {h.durum === 'aktif' ? 'Aktif' : 'İptal'}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
