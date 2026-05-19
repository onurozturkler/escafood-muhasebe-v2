'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  onOnay: () => void
  onIptal: () => void
  baslik?: string
  mesaj?: string
}

export default function SifreOnay({ onOnay, onIptal, baslik = 'Şifre Doğrulama', mesaj }: Props) {
  const [sifre, setSifre]   = useState('')
  const [hata, setHata]     = useState('')
  const [loading, setLoading] = useState(false)

  const dogrula = async () => {
    if (!sifre) return
    setLoading(true)
    setHata('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) { setHata('Kullanıcı bilgisi alınamadı.'); setLoading(false); return }

    // Şifreyi kontrol etmek için signInWithPassword kullan
    const { error } = await supabase.auth.signInWithPassword({
      email:    user.email,
      password: sifre,
    })

    setLoading(false)

    if (error) {
      setHata('Şifre hatalı. Lütfen tekrar deneyin.')
      setSifre('')
      return
    }

    onOnay()
  }

  return (
    <div className="modal-overlay" onClick={e => { if(e.target === e.currentTarget) onIptal() }}>
      <div className="modal-box" style={{ maxWidth: 360 }}>
        <div style={{ padding: '24px 24px 0' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#FEF0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 16 }}>
            🔒
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{baslik}</h2>
          {mesaj && <p style={{ fontSize: 13, color: '#5A6072', lineHeight: 1.6, marginBottom: 16 }}>{mesaj}</p>}
          <div>
            <label className="form-label">Şifrenizi girin</label>
            <input
              type="password"
              value={sifre}
              onChange={e => { setSifre(e.target.value); setHata('') }}
              onKeyDown={e => e.key === 'Enter' && dogrula()}
              className="form-input"
              placeholder="••••••••"
              autoFocus
            />
            {hata && (
              <p style={{ fontSize: 12, color: '#B91C1C', marginTop: 6, background: '#FEF0F0', padding: '6px 10px', borderRadius: 6 }}>
                {hata}
              </p>
            )}
          </div>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', gap: 10 }}>
          <button
            onClick={dogrula}
            disabled={loading || !sifre}
            className="btn btn-danger"
            style={{ flex: 1, justifyContent: 'center', background: '#7F1D1D', borderColor: '#7F1D1D', color: '#fff' }}
          >
            {loading ? 'Doğrulanıyor...' : 'Onayla'}
          </button>
          <button onClick={onIptal} className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
            İptal
          </button>
        </div>
      </div>
    </div>
  )
}
