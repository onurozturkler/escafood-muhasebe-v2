// ============================================
// Firebase → Supabase Migrasyon Scripti
// ============================================
// Kullanım:
//   node migrate.js
//
// Önce şu env değişkenlerini ayarla:
//   FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL
//   SUPABASE_URL, SUPABASE_SERVICE_KEY
// ============================================

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore }        = require('firebase-admin/firestore');
const { createClient }        = require('@supabase/supabase-js');

// ---------- Firebase bağlantısı ----------
initializeApp({
  credential: cert({
    projectId:   process.env.FIREBASE_PROJECT_ID,
    privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
});
const fb = getFirestore();

// ---------- Supabase bağlantısı ----------
const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // service_role key — RLS bypass
);

// ---------- Yardımcı ----------
const ts = (val) => {
  if (!val) return new Date().toISOString();
  if (typeof val === 'number') return new Date(val).toISOString();
  if (val?.toDate) return val.toDate().toISOString();
  return new Date(val).toISOString();
};

const chunk = (arr, size) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );

// ---------- 1. Müşteriler ----------
async function migrateMusteriler() {
  console.log('\n[1/4] Müşteriler aktarılıyor...');
  const snap = await fb.collection('musteriler').get();
  const rows = snap.docs.map(d => {
    const f = d.data();
    return {
      id:          d.id,        // Firebase doc id → Supabase id (uuid değil ama çalışır)
      musteri_adi: f.musteriAdi || f.musteri_adi || 'İsimsiz',
      adres:       f.adres || null,
      telefon:     f.telefon || null,
      email:       f.email || null,
      aktif:       true,
      created_at:  ts(f.createdAt || null),
    };
  });

  // Supabase uuid ister — Firebase string id'leri map'leyelim
  const idMap = {};
  rows.forEach(r => {
    idMap[r.id] = r.id; // aynı tutuyoruz, Supabase text pk kabul eder
  });

  for (const batch of chunk(rows, 50)) {
    const { error } = await sb.from('musteriler').upsert(batch);
    if (error) console.error('  Müşteri hata:', error.message);
  }
  console.log(`  ${rows.length} müşteri aktarıldı.`);
  return idMap;
}

// ---------- 2. Ürünler ----------
async function migrateUrunler() {
  console.log('\n[2/4] Ürünler aktarılıyor...');
  const snap = await fb.collection('urunler').get();
  const rows = snap.docs.map(d => {
    const f = d.data();
    return {
      id:           d.id,
      urun_adi:     f.urunAdi || f.urun_adi || 'İsimsiz Ürün',
      barkod:       f.barkod && f.barkod !== '0000000000000' ? f.barkod : null,
      liste_fiyati: parseFloat(f.fiyat || 0),
      birim:        f.birim || 'adet',
      aktif:        true,
      created_at:   ts(f.createdAt || null),
    };
  });

  for (const batch of chunk(rows, 50)) {
    const { error } = await sb.from('urunler').upsert(batch);
    if (error) console.error('  Ürün hata:', error.message);
  }
  console.log(`  ${rows.length} ürün aktarıldı.`);
}

// ---------- 3. Teklifler + Kalemler ----------
async function migrateTeklifler() {
  console.log('\n[3/4] Teklifler + kalemler aktarılıyor...');
  const snap = await fb.collection('teklifler').get();

  const teklifRows  = [];
  const kalemRows   = [];

  snap.docs.forEach(d => {
    const f = d.data();
    const urunler = f.urunler || [];

    const araTop   = parseFloat(f.toplamTutar      || 0);
    const iskontoT = parseFloat(f.iskontoTutar     || 0);
    const genTop   = parseFloat(f.geneltoplamTutar || araTop);

    teklifRows.push({
      id:             d.id,
      teklif_no:      parseInt(f.teklifNo) || 10000,
      musteri_id:     f.musteriId,
      durum:          f.iptal ? 'iptal' : 'aktif',
      iskonto_orani:  parseFloat(f.iskontoOrani || 0),
      ara_toplam:     araTop,
      iskonto_tutar:  iskontoT,
      genel_toplam:   genTop,
      tarih:          ts(f.tarih),
      created_at:     ts(f.tarih),
    });

    urunler.forEach((u, i) => {
      kalemRows.push({
        teklif_id:           d.id,
        urun_id:             null,   // snapshot olduğu için FK zorunlu değil
        urun_adi:            u.urunAdi || u.urun_adi || '?',
        barkod:              u.barkod || null,
        birim_fiyat:         parseFloat(u.fiyat || 0),
        miktar:              parseFloat(u.miktar || 1),
        toplam:              parseFloat(u.toplam || 0),
        sira:                i,
      });
    });
  });

  for (const batch of chunk(teklifRows, 50)) {
    const { error } = await sb.from('teklifler').upsert(batch);
    if (error) console.error('  Teklif hata:', error.message);
  }
  for (const batch of chunk(kalemRows, 100)) {
    const { error } = await sb.from('teklif_kalemleri').insert(batch);
    if (error) console.error('  Kalem hata:', error.message);
  }
  console.log(`  ${teklifRows.length} teklif, ${kalemRows.length} kalem aktarıldı.`);
}

// ---------- 4. Tahsilatlar ----------
async function migrateTahsilatlar() {
  console.log('\n[4/4] Tahsilatlar aktarılıyor...');
  const snap = await fb.collection('tahsilatlar').get();

  const rows = snap.docs.map(d => {
    const f = d.data();
    const tur = (f.tahsilatTuru || 'nakit').toLowerCase()
      .replace('eft/havale', 'eft_havale')
      .replace('çek', 'cek')
      .replace(/[^a-z_]/g, '');

    return {
      id:             d.id,
      tahsilat_no:    parseInt((f.tahsilatNo || '').replace('TH','')) || 10000,
      musteri_id:     f.musteriId,
      tutar:          parseFloat(f.tahsilatTutari || 0),
      tahsilat_turu:  ['nakit','eft_havale','cek','senet','diger'].includes(tur) ? tur : 'diger',
      aciklama:       f.aciklama || null,
      iptal:          f.iptal || false,
      tarih:          ts(f.tarih),
      created_at:     ts(f.tarih),
    };
  });

  for (const batch of chunk(rows, 50)) {
    const { error } = await sb.from('tahsilatlar').upsert(batch);
    if (error) console.error('  Tahsilat hata:', error.message);
  }
  console.log(`  ${rows.length} tahsilat aktarıldı.`);
}

// ---------- Ana akış ----------
(async () => {
  console.log('=== Migrasyon başlıyor ===');
  try {
    await migrateMusteriler();
    await migrateUrunler();
    await migrateTeklifler();
    await migrateTahsilatlar();
    console.log('\n=== Migrasyon tamamlandı ===');
  } catch (err) {
    console.error('FATAL:', err);
    process.exit(1);
  }
})();
