'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { teklifPDF } from '@/lib/pdf'
import SifreOnay from '@/components/SifreOnay'
import type { Teklif, TeklifKalem } from '@/types'

type Props = {
  teklif: Teklif
  musteri: { musteri_adi: string; adres: string | null }
  kalemler: TeklifKalem[]
}

type Adim = 'yok' | 'onay_modal' | 'sifre_modal'

export default function TeklifActions({ teklif, musteri, kalemler }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [adim, setAdim] = useState<Adim>('yok')

  const iptalEt = async () => {
    if (!confirm('Bu teklifi iptal etmek istediğinize emin misiniz?')) return
    setLoading(true)
    await createClient().from('teklifler').update({ durum: 'iptal' }).eq('id', teklif.id)
    setLoading(false)
    router.refresh()
  }

  const iptalGeriAl = async () => {
    setLoading(true)
    await createClient().from('teklifler').update({ durum: 'onaylandi' }).eq('id', teklif.id)
    setLoading(false)
    router.refresh()
  }

  const silKaydet = async () => {
    setLoading(true)
    const { error } = await createClient().from('teklifler').delete().eq('id', teklif.id)
    setLoading(false)
    if (error) { alert('Hata: ' + error.message); return }
    router.push('/teklifler')
  }

  return (
    <>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <button onClick={() => teklifPDF(teklif, musteri, kalemler)} className="btn btn-secondary btn-sm">
          PDF İndir
        </button>
        {teklif.durum === 'onaylandi' && (
          <button onClick={iptalEt} disabled={loading} className="btn btn-danger btn-sm">İptal Et</button>
        )}
        {teklif.durum === 'iptal' && (
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

      {/* 1. Adım — silme onay modalı */}
      {adim === 'onay_modal' && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) setAdim('yok') }}>
          <div className="modal-box" style={{ maxWidth:380 }}>
            <div style={{ padding:'24px 24px 0' }}>
              <h2 style={{ fontSize:16, fontWeight:700, marginBottom:10 }}>Teklif Silinecek</h2>
              <p style={{ fontSize:13, color:'#5A6072', lineHeight:1.6 }}>
                Teklif #{teklif.teklif_no} ve tüm kalemleri kalıcı olarak silinecek. Devam etmek için şifrenizi girmeniz gerekiyor.
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

      {/* 2. Adım — şifre doğrulama */}
      {adim === 'sifre_modal' && (
        <SifreOnay
          baslik="Silme İşlemini Onayla"
          mesaj={`Teklif #${teklif.teklif_no} kalıcı olarak silinecek. Onaylamak için şifrenizi girin.`}
          onOnay={() => { setAdim('yok'); silKaydet() }}
          onIptal={() => setAdim('yok')}
        />
      )}
    </>
  )
}
