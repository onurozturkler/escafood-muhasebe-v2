'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LOGO_URL, LOGO_W, LOGO_H } from '@/lib/logo'

const TOPBAR_H     = 64
const MOBILE_LOGO_W = 56
const MOBILE_LOGO_H = 64

const navItems = [
  { href: '/dashboard',   label: 'Özet' },
  {
    href: '/teklifler',   label: 'Teklifler',
    sub: [{ href: '/teklifler/yeni', label: '+ Yeni Teklif' }],
  },
  {
    href: '/tahsilatlar', label: 'Tahsilatlar',
    sub: [{ href: '/tahsilatlar/yeni', label: '+ Yeni Tahsilat' }],
  },
  { href: '/musteriler',  label: 'Müşteriler' },
  { href: '/urunler',     label: 'Ürünler' },
]

const bottomNavItems = [
  { href: '/dashboard',   label: 'Özet',        icon: '⊞' },
  { href: '/teklifler',   label: 'Teklifler',   icon: '◧' },
  { href: '/tahsilatlar', label: 'Tahsilatlar', icon: '◈' },
  { href: '/musteriler',  label: 'Müşteriler',  icon: '◉' },
  { href: '/urunler',     label: 'Ürünler',     icon: '◫' },
]

function NavContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const router   = useRouter()
  const logout   = async () => { await createClient().auth.signOut(); router.push('/login') }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Logo */}
      <div style={{ padding:'16px', borderBottom:'1px solid rgba(255,255,255,.07)', display:'flex', alignItems:'center', gap:12 }}>
        <img src={LOGO_URL} alt="Esca Food" width={LOGO_W} height={LOGO_H}
          style={{ objectFit:'contain', flexShrink:0 }} />
        <div>
          <div style={{ fontWeight:600, fontSize:13, color:'#fff' }}>Esca Food</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.35)', marginTop:2 }}>Muhasebe v2</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:'10px', overflowY:'auto' }}>
        <div style={{ fontSize:10, fontWeight:600, letterSpacing:'.08em', color:'rgba(255,255,255,.25)', textTransform:'uppercase', padding:'8px 10px 6px' }}>Menü</div>
        {navItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <div key={item.href}>
              <Link href={item.href} onClick={onClose} className={`nav-link ${active ? 'active' : ''}`}>
                {item.label}
              </Link>
              {/* Alt başlıklar — her zaman görünür, açılır değil */}
              {item.sub && (
                <div style={{ paddingLeft:14, marginBottom:2 }}>
                  {item.sub.map(s => {
                    const subActive = pathname === s.href
                    return (
                      <Link key={s.href} href={s.href} onClick={onClose}
                        style={{
                          display:'block', padding:'4px 10px', fontSize:12,
                          color: subActive ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.45)',
                          textDecoration:'none', borderRadius:6,
                          borderLeft: subActive ? '2px solid var(--brand)' : '2px solid transparent',
                          paddingLeft:10, marginBottom:1,
                          transition:'color 120ms',
                        }}>
                        {s.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Çıkış */}
      <div style={{ padding:'12px 10px', borderTop:'1px solid rgba(255,255,255,.07)' }}>
        <button onClick={logout} className="nav-link"
          style={{ width:'100%', background:'none', border:'none', textAlign:'left', cursor:'pointer' }}>
          Çıkış Yap
        </button>
      </div>
    </div>
  )
}

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="bottom-nav show-mobile">
      {bottomNavItems.map(item => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link key={item.href} href={item.href} className={`bottom-nav-item ${active ? 'active' : ''}`}>
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Desktop — sabit sidebar
  if (!isMobile) {
    return (
      <aside style={{ width:'var(--sidebar-w)', background:'var(--sidebar-bg)', flexShrink:0, height:'100vh', position:'sticky', top:0 }}>
        <NavContent />
      </aside>
    )
  }

  // Mobil — topbar + drawer (spacer layout.tsx'te)
  return (
    <>
      <div style={{
        position:'fixed', top:0, left:0, right:0, height:TOPBAR_H, zIndex:30,
        background:'var(--sidebar-bg)', display:'flex', alignItems:'center',
        padding:'0 16px', gap:10,
        borderBottom:'1px solid rgba(255,255,255,.08)',
      }}>
        <button onClick={() => setMobileOpen(true)}
          style={{ background:'none', border:'none', color:'#fff', fontSize:24, cursor:'pointer', lineHeight:1, padding:'0 4px', flexShrink:0 }}>
          ☰
        </button>
        <img src={LOGO_URL} alt="Esca Food"
          width={MOBILE_LOGO_W} height={MOBILE_LOGO_H}
          style={{ objectFit:'contain', flexShrink:0 }} />
        <span style={{ fontWeight:600, fontSize:14, color:'#fff' }}>Esca Food</span>
      </div>

      {/* Overlay */}
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:40 }} />
      )}

      {/* Drawer */}
      <div style={{
        position:'fixed', top:0, left:0, bottom:0, zIndex:50,
        width:'var(--sidebar-w)', background:'var(--sidebar-bg)',
        transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition:'transform 250ms cubic-bezier(.16,1,.3,1)',
        boxShadow: mobileOpen ? '4px 0 24px rgba(0,0,0,.4)' : 'none',
      }}>
        <NavContent onClose={() => setMobileOpen(false)} />
      </div>
    </>
  )
}
