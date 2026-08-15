export type Musteri = {
  id: string
  musteri_adi: string
  adres: string | null
  telefon: string | null
  email: string | null
  notlar: string | null
  aktif: boolean
  created_at: string
}

export type MusteriCari = Musteri & {
  acilis_bakiyesi: number
  toplam_borc: number
  toplam_tahsilat: number
  bakiye: number
}

export type Urun = {
  id: string
  urun_adi: string
  barkod: string | null
  liste_fiyati: number
  birim: string
  aktif: boolean
  created_at: string
}

export type TeklifDurum = 'onaylandi' | 'iptal'

export type Teklif = {
  id: string
  teklif_no: number
  musteri_id: string
  durum: TeklifDurum
  iskonto_orani: number
  ara_toplam: number
  iskonto_tutar: number
  genel_toplam: number
  notlar: string | null
  tarih: string
  created_at: string
  // join ile gelir
  musteriler?: { musteri_adi: string; adres: string | null }
}

export type TeklifKalem = {
  id: string
  teklif_id: string
  urun_id: string | null
  urun_adi: string
  barkod: string | null
  birim_fiyat: number
  miktar: number
  toplam: number
  sira: number
}

export type TeklifDetay = Teklif & {
  teklif_kalemleri: TeklifKalem[]
}

export type TahsilatTuru = 'nakit' | 'eft_havale' | 'cek' | 'senet' | 'diger'

export type Tahsilat = {
  id: string
  tahsilat_no: number
  musteri_id: string
  tutar: number
  tahsilat_turu: TahsilatTuru
  aciklama: string | null
  iptal: boolean
  tarih: string
  created_at: string
  // join ile gelir
  musteriler?: { musteri_adi: string }
}

// Form tipleri
export type TeklifKalemForm = {
  urun_id: string | null
  urun_adi: string
  barkod: string
  birim_fiyat: number
  miktar: number
  toplam: number
}

export type TeklifForm = {
  musteri_id: string
  iskonto_orani: number
  notlar: string
  kalemler: TeklifKalemForm[]
}
