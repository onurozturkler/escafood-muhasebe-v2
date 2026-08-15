// ============================================================
// Cari hesap bakiye mantığı — TEK KAYNAK
// ============================================================
// Bu bir ALACAK CARİSİ'dir:
//   - satış belgesi (teklif) müşterinin borcunu ARTIRIR  → +
//   - tahsilat                borcunu AZALTIR            → −
//
// Bu hesap daha önce hem ekstre PDF'inde hem müşteri detay
// sayfasında ayrı ayrı yazılmıştı ve ikisi de ters işaretliydi.
// Aynı hatanın iki yerde bağımsız yaşamasını engellemek için
// tüm bakiye hesabı bu modülde toplandı. Başka hiçbir yerde
// tekrar edilmemeli.

export type HareketTipi = 'teklif' | 'tahsilat'

export type Hareket = {
  tarih: string
  tip: HareketTipi
  tutar: number
  iptal: boolean
  no: string
}

/** Hareketin bakiyeye etkisi. Tek doğruluk noktası. */
export function hareketEtkisi(h: Pick<Hareket, 'tip' | 'tutar'>): number {
  return h.tip === 'teklif' ? Number(h.tutar) || 0 : -(Number(h.tutar) || 0)
}

/** Tutarın önüne yazılacak işaret. `hareketEtkisi` ile daima tutarlı. */
export function hareketIsareti(h: Pick<Hareket, 'tip'>): '+' | '-' {
  return h.tip === 'teklif' ? '+' : '-'
}

/**
 * Deterministik sıralama.
 * Aynı tarihte: önce satış belgeleri, sonra tahsilatlar;
 * kendi içlerinde belge numarasına göre.
 * Girdi sırası değişse de çıktı aynı olmalı.
 */
export function siralaHareketler<T extends Hareket>(hareketler: T[]): T[] {
  return [...hareketler].sort((a, b) => {
    const d = new Date(a.tarih).getTime() - new Date(b.tarih).getTime()
    if (d !== 0) return d
    if (a.tip !== b.tip) return a.tip === 'teklif' ? -1 : 1
    return String(a.no).localeCompare(String(b.no), 'tr', { numeric: true })
  })
}

/**
 * Kümülatif bakiye seyri. İptal edilmiş hareketler tamamen atılır.
 * Son elemanın bakiyesi daima: acilis + Σ(teklif) − Σ(tahsilat)
 */
export function bakiyeSeyri<T extends Hareket>(
  acilis: number,
  hareketler: T[]
): (T & { bakiye: number })[] {
  let bakiye = Number(acilis) || 0
  return siralaHareketler(hareketler)
    .filter(h => !h.iptal)
    .map(h => {
      bakiye += hareketEtkisi(h)
      return { ...h, bakiye }
    })
}

/**
 * `bakiyeSeyri` ile aynı hesap, ancak iptal edilmiş hareketler de
 * listede kalır (bakiye = null). Ekranda iptalleri üstü çizili
 * gösterebilmek için. Geçerli hareketlerin bakiyeleri `bakiyeSeyri`
 * ile birebir aynıdır.
 */
export function bakiyeSeyriTumu<T extends Hareket>(
  acilis: number,
  hareketler: T[]
): (T & { bakiye: number | null })[] {
  let bakiye = Number(acilis) || 0
  return siralaHareketler(hareketler).map(h => {
    if (h.iptal) return { ...h, bakiye: null }
    bakiye += hareketEtkisi(h)
    return { ...h, bakiye }
  })
}

/** Kapanış bakiyesi — doğrulama ve test için. */
export function kapanisBakiyesi(acilis: number, hareketler: Hareket[]): number {
  return (Number(acilis) || 0) + hareketler
    .filter(h => !h.iptal)
    .reduce((s, h) => s + hareketEtkisi(h), 0)
}
