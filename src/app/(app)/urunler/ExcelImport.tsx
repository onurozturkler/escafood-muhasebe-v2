'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import * as XLSX from 'xlsx'

type SatirHata = { satir: number; hata: string }

type OnizlemeSatir = {
  urun_adi: string
  barkod: string | null
  liste_fiyati: number
  birim: string
  gecerli: boolean
  hata?: string
}

export default function ExcelImport() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [onizleme, setOnizleme] = useState<OnizlemeSatir[]>([])
  const [hatalar, setHatalar] = useState<SatirHata[]>([])
  const [yukleniyor, setYukleniyor] = useState(false)
  const [tamamlandi, setTamamlandi] = useState(false)
  const [sonuc, setSonuc] = useState({ eklenen: 0, atlanan: 0 })

  const sifirla = () => {
    setOnizleme([])
    setHatalar([])
    setTamamlandi(false)
    setSonuc({ eklenen: 0, atlanan: 0 })
    if (inputRef.current) inputRef.current.value = ''
  }

  const dosyaOku = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dosya = e.target.files?.[0]
    if (!dosya) return
    sifirla()

    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const satirlar: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 })

      // İlk satır başlık — atla
      const baslikSatiri = satirlar[0]?.map((h: any) => String(h).toLowerCase().trim()) ?? []

      // Sütun indekslerini bul (esnek)
      const colUrunAdi    = baslikSatiri.findIndex((h: string) => h.includes('ürün') || h.includes('urun') || h === 'ad' || h === 'adi' || h === 'name')
      const colBarkod     = baslikSatiri.findIndex((h: string) => h.includes('barkod') || h.includes('barcode') || h.includes('ean'))
      const colFiyat      = baslikSatiri.findIndex((h: string) => h.includes('fiyat') || h.includes('price') || h.includes('tutar'))
      const colBirim      = baslikSatiri.findIndex((h: string) => h.includes('birim') || h.includes('unit'))

      const satirHatalari: SatirHata[] = []
      const onizlemeSatirlari: OnizlemeSatir[] = []

      satirlar.slice(1).forEach((satir, idx) => {
        const satirNo = idx + 2 // Excel satır numarası

        // Eğer sütun bulunamadıysa ilk 5 sütunu varsayılan sırayla kullan
        const urunAdi    = colUrunAdi  >= 0 ? satir[colUrunAdi]  : satir[0]
        const barkod     = colBarkod   >= 0 ? satir[colBarkod]   : satir[1]
        const fiyatHam   = colFiyat    >= 0 ? satir[colFiyat]    : satir[2]
        const birimHam   = colBirim    >= 0 ? satir[colBirim]    : satir[3]

        // Boş satırı atla
        if (!urunAdi && !barkod && !fiyatHam) return

        const ad = String(urunAdi ?? '').trim()
        if (!ad) {
          satirHatalari.push({ satir: satirNo, hata: 'Ürün adı boş' })
          onizlemeSatirlari.push({ urun_adi: '(boş)', barkod: null, liste_fiyati: 0, birim: 'adet', gecerli: false, hata: 'Ürün adı boş' })
          return
        }

        const fiyat = parseFloat(String(fiyatHam ?? '0').replace(',', '.')) || 0
        const barkodStr = barkod ? String(barkod).trim() : null
        const birim = String(birimHam ?? 'adet').trim().toLowerCase() || 'adet'

        // Birim normalize
        const birimMap: Record<string, string> = {
          'adet': 'adet', 'ad': 'adet',
          'kg': 'kg', 'kilogram': 'kg',
          'lt': 'lt', 'litre': 'lt', 'liter': 'lt', 'l': 'lt',
          'koli': 'koli', 'box': 'koli',
          'paket': 'paket', 'pkt': 'paket', 'pack': 'paket',
        }
        const birimNorm = birimMap[birim] ?? 'adet'

        onizlemeSatirlari.push({
          urun_adi:    ad,
          barkod:      barkodStr && barkodStr !== '0' ? barkodStr : null,
          liste_fiyati: fiyat,
          birim:       birimNorm,
          gecerli:     true,
        })
      })

      setHatalar(satirHatalari)
      setOnizleme(onizlemeSatirlari)
    }
    reader.readAsArrayBuffer(dosya)
  }

  const iceriAktar = async () => {
    const gecerliSatirlar = onizleme.filter(s => s.gecerli)
    if (gecerliSatirlar.length === 0) return

    setYukleniyor(true)
    const supabase = createClient()

    let eklenen = 0
    let atlanan = 0

    // 50'li gruplar halinde upsert (barkod varsa güncelle, yoksa ekle)
    const gruplar = []
    for (let i = 0; i < gecerliSatirlar.length; i += 50) {
      gruplar.push(gecerliSatirlar.slice(i, i + 50))
    }

    for (const grup of gruplar) {
      const { data, error } = await supabase
        .from('urunler')
        .upsert(
          grup.map(s => ({
            urun_adi:     s.urun_adi,
            barkod:       s.barkod,
            liste_fiyati: s.liste_fiyati,
            birim:        s.birim,
            aktif:        true,
          })),
          { onConflict: 'barkod', ignoreDuplicates: false }
        )
        .select()

      if (error) {
        // Barkod çakışması varsa barkod olmadan dene
        for (const satir of grup) {
          const { error: e2 } = await supabase.from('urunler').insert({
            urun_adi:     satir.urun_adi,
            barkod:       null,
            liste_fiyati: satir.liste_fiyati,
            birim:        satir.birim,
            aktif:        true,
          })
          if (e2) atlanan++
          else eklenen++
        }
      } else {
        eklenen += data?.length ?? grup.length
      }
    }

    setYukleniyor(false)
    setTamamlandi(true)
    setSonuc({ eklenen, atlanan })
    router.refresh()
  }

  const gecerliSayisi = onizleme.filter(s => s.gecerli).length

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
      >
        Excel İmport
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) { setOpen(false); sifirla() } }}
        >
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-[85vh]">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Excel ile Ürün İçe Aktar</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Sütunlar: <span className="font-mono">Ürün Adı, Barkod, Fiyat, Birim</span> (başlık satırı olmalı)
                </p>
              </div>
              <button onClick={() => { setOpen(false); sifirla() }} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <div className="px-6 py-4 overflow-y-auto flex-1">
              {!tamamlandi ? (
                <>
                  <div
                    className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors mb-4"
                    onClick={() => inputRef.current?.click()}
                  >
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={dosyaOku}
                    />
                    <p className="text-sm text-gray-500">
                      <span className="text-blue-600 font-medium">Dosya seç</span> veya buraya sürükle
                    </p>
                    <p className="text-xs text-gray-400 mt-1">.xlsx, .xls, .csv</p>
                  </div>

                  {onizleme.length > 0 && (
                    <>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-sm text-gray-700 font-medium">
                          {gecerliSayisi} satır aktarılacak
                        </span>
                        {hatalar.length > 0 && (
                          <span className="text-sm text-red-600">
                            {hatalar.length} satırda hata
                          </span>
                        )}
                      </div>

                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50 text-gray-500">
                            <tr>
                              <th className="text-left px-3 py-2 font-medium">Ürün Adı</th>
                              <th className="text-left px-3 py-2 font-medium">Barkod</th>
                              <th className="text-right px-3 py-2 font-medium">Fiyat</th>
                              <th className="text-left px-3 py-2 font-medium">Birim</th>
                              <th className="px-3 py-2"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {onizleme.slice(0, 20).map((s, i) => (
                              <tr key={i} className={`border-t border-gray-100 ${!s.gecerli ? 'bg-red-50' : ''}`}>
                                <td className="px-3 py-1.5">{s.urun_adi}</td>
                                <td className="px-3 py-1.5 font-mono text-gray-500">{s.barkod ?? '-'}</td>
                                <td className="px-3 py-1.5 text-right">₺{s.liste_fiyati.toFixed(2)}</td>
                                <td className="px-3 py-1.5 text-gray-500">{s.birim}</td>
                                <td className="px-3 py-1.5 text-center">
                                  {s.gecerli
                                    ? <span className="text-green-500">✓</span>
                                    : <span className="text-red-500" title={s.hata}>✗</span>
                                  }
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {onizleme.length > 20 && (
                          <p className="text-xs text-gray-400 text-center py-2 border-t border-gray-100">
                            +{onizleme.length - 20} satır daha
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="py-8 text-center">
                  <div className="text-4xl mb-3">✓</div>
                  <p className="text-base font-semibold text-gray-900 mb-1">Aktarım tamamlandı</p>
                  <p className="text-sm text-gray-500">
                    <span className="text-green-600 font-medium">{sonuc.eklenen} ürün</span> eklendi
                    {sonuc.atlanan > 0 && <>, <span className="text-red-600 font-medium">{sonuc.atlanan} satır</span> atlandı</>}
                  </p>
                </div>
              )}
            </div>

            {!tamamlandi && onizleme.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
                <button
                  onClick={iceriAktar}
                  disabled={yukleniyor || gecerliSayisi === 0}
                  className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {yukleniyor ? `Aktarılıyor...` : `${gecerliSayisi} Ürünü Aktar`}
                </button>
                <button
                  onClick={sifirla}
                  className="px-4 border border-gray-300 text-gray-700 text-sm py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Temizle
                </button>
              </div>
            )}

            {tamamlandi && (
              <div className="px-6 py-4 border-t border-gray-100">
                <button
                  onClick={() => { setOpen(false); sifirla() }}
                  className="w-full bg-gray-900 text-white text-sm font-medium py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Kapat
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
