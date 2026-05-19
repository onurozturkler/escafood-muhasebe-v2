'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LOGO_URL, LOGO_W, LOGO_H } from '@/lib/logo'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await createClient().auth.signInWithPassword({ email, password })
    if (error) { setError('E-posta veya şifre hatalı.'); setLoading(false); return }
    router.push('/dashboard'); router.refresh()
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: 'linear-gradient(135deg, #111318 0%, #1C1F28 60%, #0E1016 100%)',
    }}>
      {/* Sol panel */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 48px', flexDirection: 'column', gap: 32,
      }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div style={{ marginBottom: 36, display: 'flex', alignItems: 'center', gap: 14 }}>
            <img src="https://esca-food.com/image/cache/catalog/esca_food_muhasebe_v2_transparent-700x800.png" alt="Esca Food" width={LOGO_W} height={LOGO_H} style={{ objectFit: 'contain' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 20, color: '#fff', letterSpacing: '-.02em' }}>Esca Food</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>Muhasebe Sistemi</div>
            </div>
          </div>

          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: '-.03em', marginBottom: 6 }}>
            Giriş Yap
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,.45)', marginBottom: 32 }}>
            Hesabınıza erişmek için bilgilerinizi girin.
          </p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="form-label" style={{ color: 'rgba(255,255,255,.5)' }}>E-posta</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required autoFocus
                className="form-input"
                style={{ background: 'rgba(255,255,255,.06)', border: '1.5px solid rgba(255,255,255,.12)', color: '#fff' }}
                placeholder="ad@escafood.com"
              />
            </div>
            <div>
              <label className="form-label" style={{ color: 'rgba(255,255,255,.5)' }}>Şifre</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                required
                className="form-input"
                style={{ background: 'rgba(255,255,255,.06)', border: '1.5px solid rgba(255,255,255,.12)', color: '#fff' }}
              />
            </div>

            {error && (
              <div style={{ background: 'rgba(208,30,30,.15)', border: '1px solid rgba(208,30,30,.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#FCA5A5' }}>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="btn btn-primary"
              style={{ marginTop: 4, padding: '11px 0', fontSize: 14, fontWeight: 600, justifyContent: 'center', borderRadius: 9 }}
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap →'}
            </button>
          </form>
        </div>
      </div>

      {/* Sağ dekoratif panel - desktop only */}
      <div style={{
        width: 380, background: 'rgba(208,30,30,.08)',
        borderLeft: '1px solid rgba(208,30,30,.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 40, flexDirection: 'column', gap: 24,
      }} className="login-deco">
        <style>{`@media(max-width:767px){.login-deco{display:none!important}}`}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🐾</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: 'rgba(255,255,255,.8)', letterSpacing: '-.02em', marginBottom: 8 }}>
            Premium Pet Products
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.35)', lineHeight: 1.6 }}>
            Teklif, cari hesap ve tahsilat<br/>takibiniz tek bir sistemde.
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
          {['Teklif oluşturma ve PDF', 'Cari hesap takibi', 'Tahsilat kayıtları', 'Ürün yönetimi'].map(t => (
            <div key={t} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(255,255,255,.04)', borderRadius: 8, padding: '10px 14px',
              border: '1px solid rgba(255,255,255,.07)',
            }}>
              <span style={{ color: '#EF4444', fontSize: 13 }}>✓</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,.55)' }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
