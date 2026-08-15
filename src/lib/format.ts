export const para = (val: number | null | undefined) =>
  new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val ?? 0)

export const tarih = (val: string | null | undefined) => {
  if (!val) return '-'
  return new Date(val).toLocaleDateString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

export const tahsilatTuruLabel: Record<string, string> = {
  nakit:       'Nakit',
  eft_havale:  'EFT/Havale',
  cek:         'Çek',
  senet:       'Senet',
  diger:       'Diğer',
}

export const durumLabel: Record<string, string> = {
  iptal:      'İptal',
  onaylandi:  'Onaylandı',
}

export const durumRenk: Record<string, string> = {
  iptal:     'text-red-700 bg-red-50',
  onaylandi: 'text-blue-700 bg-blue-50',
}

/**
 * Türkçe formatlı sayı metnini güvenli şekilde çözer.
 * parseFloat("140.850,15") → 140.85 (bin kat hata, sessizce).
 * Bu fonksiyon → 140850.15
 */
export const sayiCoz = (v: unknown): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  if (v == null) return 0
  const s = String(v).trim()
  if (!s) return 0
  // "1.234.567,89" -> "1234567.89" | "1234.56" -> "1234.56"
  const normalize = s.includes(',')
    ? s.replace(/\./g, '').replace(',', '.')
    : s
  const n = parseFloat(normalize.replace(/[^\d.\-]/g, ''))
  return Number.isFinite(n) ? n : 0
}
