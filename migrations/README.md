# Migration — çalıştırma sırası

Hepsi Supabase → **SQL Editor**'de çalışır.

| Adım | Dosya | Ne yapar | Sonrasında |
|---|---|---|---|
| 1 | `001_a0_on_kontrol.sql` | Hiçbir şeyi değiştirmez. Durum dağılımı, 2 snapshot tablosu, etkilenen müşteri raporu, prod view tanımı | **Çıktıları oku, listeyi onayla** |
| 2 | `002_migration_ve_dogrulama.sql` | Migration + view + otomatik doğrulama, tek transaction | Geçerse commit, geçmezse otomatik rollback |
| 3 | Kodu deploy et | — | — |
| 4 | `003_schema_senkron.md` | `schema.sql`'i prod'dan çek | — |
| — | `999_geri_alma.sql` | Sadece commit sonrası pişmanlık için | — |

## Neden tek dosyada migration + doğrulama?

Supabase SQL Editor'de her "Run" **ayrı bir transaction**'dır. "Migration'ı
çalıştır, açık bırak, doğrula, sonra commit et" akışı o arayüzde mümkün değil.
Bu yüzden doğrulama `002`'nin içine, transaction'ın sonuna gömüldü:

```
begin;
  ...migration...
  do $$ ... if uyusmuyorsa then raise exception ... $$;   -- otomatik rollback
commit;
```

Doğrulamanın kuralı: **her müşterinin bakiye farkı, o müşterinin migration
öncesinde `onaylandi` olan belgelerinin toplamına tam eşit olmalı.** Tek kuruş
sapma varsa transaction patlar ve hiçbir şey değişmez.

Doğrulama patlarsa en olası sebep: `002`'deki view tanımı prod'daki view ile
aynı değil. `001`'in 6. sorgusunun çıktısıyla karşılaştır.

## Test edildi mi?

Evet. Yerel PostgreSQL 16'da, prod yapısını taklit eden sentetik bir veritabanında
iki senaryo çalıştırıldı:

- **Doğru view ile:** commit etti, yalnızca `onaylandi` belgesi olan müşterilerin
  bakiyesi arttı, toplam belge sayısı ve toplam tutar değişmedi.
- **Farklı view ile:** `A3 DOGRULAMA BASARISIZ` hatası verip ROLLBACK yaptı,
  `durum` alanı hiç değişmedi.

Bu prod verini test etmez — sadece script'in mantığının doğru olduğunu gösterir.

## Sıralama uyarısı

**Önce migration (adım 2), sonra kod deploy (adım 3).**
Bölüm C'deki kod `durum` alanının yalnızca `onaylandi`/`iptal` alacağını
varsayıyor. Ters sırada yaparsan bakiyeler doğru kalır ama `aktif`
durumundaki belgeler arayüzde "Onaylandı" etiketiyle görünür.

## Snapshot tablolarını silme

`_migration_bakiye_snapshot` ve `_migration_onaylandi_snapshot` tabloları
migration sonrası da durmalı — geri alma ve denetim için gerekli.
