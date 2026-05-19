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
  aktif:      'Aktif',
  iptal:      'İptal',
  onaylandi:  'Onaylandı',
}

export const durumRenk: Record<string, string> = {
  aktif:     'text-green-700 bg-green-50',
  iptal:     'text-red-700 bg-red-50',
  onaylandi: 'text-blue-700 bg-blue-50',
}
