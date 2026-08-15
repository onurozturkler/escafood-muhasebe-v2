// ============================================================
// Bölüm E — Regresyon testleri (veritabanına dokunmaz)
// Çalıştır:  npm test
// ============================================================
import test from 'node:test'
import assert from 'node:assert/strict'
import { bakiyeSeyri, bakiyeSeyriTumu, siralaHareketler, kapanisBakiyesi, type Hareket } from '../src/lib/cari.ts'
import { sayiCoz } from '../src/lib/format.ts'

// --- Deterministik sözde-rastgele üreteç (test tekrarlanabilir olsun) ---
function rng(seed: number) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

function uretHareketler(n: number, seed = 42): Hareket[] {
  const r = rng(seed)
  const gunler = ['2026-08-01', '2026-08-02', '2026-08-02', '2026-08-05', '2026-08-07']
  return Array.from({ length: n }, (_, i) => {
    const teklif = r() < 0.55
    return {
      tarih: `${gunler[Math.floor(r() * gunler.length)]}T10:00:00Z`,
      tip: (teklif ? 'teklif' : 'tahsilat') as Hareket['tip'],
      tutar: Math.round(r() * 500000) / 100,
      iptal: r() < 0.2,
      no: teklif ? `#${10001 + i}` : `TH${10001 + i}`,
    }
  })
}

const round2 = (n: number) => Math.round(n * 100) / 100

// --- 1. Bakiye kapanış testi -------------------------------
test('bakiyeSeyri: son bakiye = acilis + Σ(teklif) − Σ(tahsilat)', () => {
  for (const seed of [1, 42, 7, 999, 2026]) {
    const h = uretHareketler(50, seed)
    const acilis = 12345.67
    const seyir = bakiyeSeyri(acilis, h)

    const gecerli = h.filter(x => !x.iptal)
    const beklenen = acilis
      + gecerli.filter(x => x.tip === 'teklif').reduce((s, x) => s + x.tutar, 0)
      - gecerli.filter(x => x.tip === 'tahsilat').reduce((s, x) => s + x.tutar, 0)

    assert.equal(seyir.length, gecerli.length, 'iptal olmayan hareket sayısı eşleşmeli')
    assert.equal(round2(seyir[seyir.length - 1].bakiye), round2(beklenen))
    assert.equal(round2(kapanisBakiyesi(acilis, h)), round2(beklenen))
  }
})

test('bakiyeSeyri: satış borcu ARTIRIR, tahsilat AZALTIR (alacak carisi)', () => {
  const s = bakiyeSeyri(0, [
    { tarih: '2026-08-01T00:00:00Z', tip: 'teklif',   tutar: 1000, iptal: false, no: '#1' },
    { tarih: '2026-08-02T00:00:00Z', tip: 'tahsilat', tutar: 400,  iptal: false, no: 'TH1' },
  ])
  assert.equal(s[0].bakiye, 1000)
  assert.equal(s[1].bakiye, 600)
})

test('bakiyeSeyri: boş liste açılış bakiyesini bozmaz', () => {
  assert.deepEqual(bakiyeSeyri(500, []), [])
  assert.equal(kapanisBakiyesi(500, []), 500)
})

// --- 2. İptal testi ----------------------------------------
test('iptal edilmiş hareketler ne bakiyeyi ne toplamları etkiler', () => {
  const temel: Hareket[] = [
    { tarih: '2026-08-01T00:00:00Z', tip: 'teklif',   tutar: 1000, iptal: false, no: '#1' },
    { tarih: '2026-08-03T00:00:00Z', tip: 'tahsilat', tutar: 250,  iptal: false, no: 'TH1' },
  ]
  const iptalli: Hareket[] = [
    ...temel,
    { tarih: '2026-08-02T00:00:00Z', tip: 'teklif',   tutar: 99999, iptal: true, no: '#2' },
    { tarih: '2026-08-02T00:00:00Z', tip: 'tahsilat', tutar: 88888, iptal: true, no: 'TH2' },
  ]
  assert.equal(kapanisBakiyesi(0, temel), kapanisBakiyesi(0, iptalli))
  assert.deepEqual(
    bakiyeSeyri(0, temel).map(h => h.bakiye),
    bakiyeSeyri(0, iptalli).map(h => h.bakiye),
  )
})

test('bakiyeSeyriTumu: iptalleri listede tutar ama bakiye = null', () => {
  const h: Hareket[] = [
    { tarih: '2026-08-01T00:00:00Z', tip: 'teklif',   tutar: 1000,  iptal: false, no: '#1' },
    { tarih: '2026-08-02T00:00:00Z', tip: 'teklif',   tutar: 99999, iptal: true,  no: '#2' },
    { tarih: '2026-08-03T00:00:00Z', tip: 'tahsilat', tutar: 250,   iptal: false, no: 'TH1' },
  ]
  const tumu = bakiyeSeyriTumu(0, h)
  assert.equal(tumu.length, 3)
  assert.equal(tumu[1].bakiye, null)
  // Geçerli hareketlerin bakiyeleri bakiyeSeyri ile birebir aynı olmalı
  assert.deepEqual(
    tumu.filter(x => x.bakiye !== null).map(x => x.bakiye),
    bakiyeSeyri(0, h).map(x => x.bakiye),
  )
})

// --- B1 kabul kriteri --------------------------------------
// "Ekstrenin SON SATIRINDAKİ bakiye, özet kutusundaki Bakiye'ye
//  birebir eşit olmalı." Özet kutusu musteri_cari view'ından gelir:
//    bakiye = acilis_bakiyesi + toplam_borc - toplam_tahsilat
//  view (migration sonrası): teklifler where durum <> 'iptal'
//                            tahsilatlar where iptal = false
test('ekstre son satır bakiyesi = musteri_cari.bakiye (özet kutusu)', () => {
  for (const seed of [1, 42, 7, 999, 2026, 31337]) {
    const h = uretHareketler(50, seed)
    const acilis = 12345.67

    // musteri_cari view'ının yaptığı hesabın birebir simülasyonu
    const toplam_borc = h.filter(x => x.tip === 'teklif' && !x.iptal).reduce((s, x) => s + x.tutar, 0)
    const toplam_tahsilat = h.filter(x => x.tip === 'tahsilat' && !x.iptal).reduce((s, x) => s + x.tutar, 0)
    const viewBakiye = acilis + toplam_borc - toplam_tahsilat

    const seyir = bakiyeSeyri(acilis, h)
    const sonSatir = seyir[seyir.length - 1].bakiye

    assert.equal(round2(sonSatir), round2(viewBakiye),
      `seed ${seed}: son satır ${sonSatir} ≠ özet ${viewBakiye}`)
  }
})

test('regresyon: ters işaret olsaydı fark tam olarak 2×(tahsilat−borc) olurdu', () => {
  const h = uretHareketler(50, 42)
  const acilis = 0
  const borc = h.filter(x => x.tip === 'teklif' && !x.iptal).reduce((s, x) => s + x.tutar, 0)
  const tahsilat = h.filter(x => x.tip === 'tahsilat' && !x.iptal).reduce((s, x) => s + x.tutar, 0)

  const dogru = kapanisBakiyesi(acilis, h)                 // +borc -tahsilat
  const eskiHatali = acilis - borc + tahsilat              // eski kod
  assert.equal(round2(dogru - eskiHatali), round2(2 * (borc - tahsilat)))
  assert.equal(round2(dogru), round2(borc - tahsilat))
})

// --- 3. Türkçe sayı testi ----------------------------------
test('sayiCoz: Türkçe formatlı metinleri doğru çözer', () => {
  assert.equal(sayiCoz('140.850,15'), 140850.15)
  assert.equal(sayiCoz('1234.56'), 1234.56)
  assert.equal(sayiCoz(''), 0)
  assert.equal(sayiCoz(null), 0)
  assert.equal(sayiCoz(undefined), 0)
  assert.equal(sayiCoz('1.234.567,89'), 1234567.89)
  assert.equal(sayiCoz('₺ 140.850,15'), 140850.15)
  assert.equal(sayiCoz(140850.15), 140850.15)
  assert.equal(sayiCoz('abc'), 0)
  assert.equal(sayiCoz(NaN), 0)
  assert.equal(sayiCoz('0'), 0)
  // Regresyon: parseFloat bunu 140.85 okuyordu — bin kat hata
  assert.notEqual(sayiCoz('140.850,15'), 140.85)
})

// --- 4. Sıralama testi -------------------------------------
test('bakiyeSeyri: girdi sırası değişse de çıktı aynı', () => {
  const h = uretHareketler(50, 7)
  const karisik = [...h].reverse()
  const karisik2 = [...h].sort((a, b) => a.no.localeCompare(b.no))

  const a = bakiyeSeyri(1000, h)
  const b = bakiyeSeyri(1000, karisik)
  const c = bakiyeSeyri(1000, karisik2)

  assert.deepEqual(a, b)
  assert.deepEqual(a, c)
})

test('siralaHareketler: aynı tarihte önce teklif, sonra tahsilat; kendi içinde no sırası', () => {
  const g = '2026-08-07T00:00:00Z'
  const h: Hareket[] = [
    { tarih: g, tip: 'tahsilat', tutar: 1, iptal: false, no: 'TH10040' },
    { tarih: g, tip: 'tahsilat', tutar: 1, iptal: false, no: 'TH10036' },
    { tarih: g, tip: 'teklif',   tutar: 1, iptal: false, no: '#10009' },
    { tarih: g, tip: 'teklif',   tutar: 1, iptal: false, no: '#10002' },
  ]
  assert.deepEqual(siralaHareketler(h).map(x => x.no), ['#10002', '#10009', 'TH10036', 'TH10040'])
})

test('siralaHareketler: girdi dizisini mutasyona uğratmaz', () => {
  const h = uretHareketler(10, 3)
  const kopya = JSON.parse(JSON.stringify(h))
  siralaHareketler(h)
  bakiyeSeyri(0, h)
  assert.deepEqual(h, kopya)
})
