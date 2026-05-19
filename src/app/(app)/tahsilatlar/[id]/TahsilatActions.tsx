'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { tahsilatPDF } from '@/lib/pdf'
import SifreOnay from '@/components/SifreOnay'

type Props = {
  tahsilat: any
  musteri: { musteri_adi: string; adres: string | null }
}

type Adim = 'yok' | 'onay_modal' | 'sifre_modal'

export default function TahsilatActions({ tahsilat, musteri }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [adim, setAdim] = useState<Adim>('yok')

  const iptalEt = async () => {
    if (!confirm('Bu tahsilatı iptal etmek istediğinize emin misiniz?')) return
    setLoading(true)
    await createClient().from('tahsilatlar').update({ iptal: true }).eq('id', tahsilat.id)
    setLoading(false)
    router.refresh()
  }

  const iptalGeriAl = async () => {
    setLoading(true)
    await createClient().from('tahsilatlar').update({ iptal: false }).eq('id', tahsilat.id)
    setLoading(false)
    router.refresh()
  }

  const silKaydet = async () => {
    setLoading(true)
    const { error } = await createClient().from('tahsilatlar').delete().eq('id', tahsilat.id)
    setLoading(false)
    if (error) { alert('Hata: ' + error.message); return }
    router.push('/tahsilatlar')
  }

  return (
    <>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <button onClick={() => tahsilatPDF(tahsilat, musteri)} className="btn btn-secondary btn-sm">
          PDF İndir
        </button>
        {!tahsilat.iptal && (
          <button onClick={iptalEt} disabled={loading} className="btn btn-danger btn-sm">İptal Et</button>
        )}
        {tahsilat.iptal && (
          <button onClick={iptalGeriAl} disabled={loading} className="btn btn-secondary btn-sm">İptali Geri Al</button>
        )}
        <button
          onClick={() => setAdim('onay_modal')}
          disabled={loading}
          className="btn btn-sm"
          style={{ background:'#7F1D1D', borderColor:'#7F1D1D', color:'#fff' }}
        >
          Sil
        </button>
      </div>

      {adim === 'onay_modal' && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) setAdim('yok') }}>
          <div className="modal-box" style={{ maxWidth:380 }}>
            <div style={{ padding:'24px 24px 0' }}>
              <h2 style={{ fontSize:16, fontWeight:700, marginBottom:10 }}>Tahsilat Silinecek</h2>
              <p style={{ fontSize:13, color:'#5A6072', lineHeight:1.6 }}>
                Tahsilat #{tahsilat.tahsilat_no} kalıcı olarak silinecek. Devam etmek için şifrenizi girmeniz gerekiyor.
              </p>
            </div>
            <div style={{ padding:'20px 24px', display:'flex', gap:10 }}>
              <button
                onClick={() => setAdim('sifre_modal')}
                className="btn btn-sm"
                style={{ flex:1, justifyContent:'center', background:'#7F1D1D', borderColor:'#7F1D1D', color:'#fff' }}
              >
                Devam Et
              </button>
              <button onClick={() => setAdim('yok')} className="btn btn-secondary" style={{ flex:1, justifyContent:'center' }}>İptal</button>
            </div>
          </div>
        </div>
      )}

      {adim === 'sifre_modal' && (
        <SifreOnay
          baslik="Silme İşlemini Onayla"
          mesaj={`Tahsilat #${tahsilat.tahsilat_no} kalıcı olarak silinecek. Onaylamak için şifrenizi girin.`}
          onOnay={() => { setAdim('yok'); silKaydet() }}
          onIptal={() => setAdim('yok')}
        />
      )}
    </>
  )
}
