-- ============================================================
-- ADIM 2 / A1 + A2 + A3 — MIGRATION + OTOMATİK DOĞRULAMA
-- Supabase → SQL Editor → hepsini yapıştır → Run (TEK SEFERDE)
--
-- ÖN KOŞULLAR
--   1. ADIM 1 çalıştırıldı (iki snapshot tablosu mevcut)
--   2. ADIM 1'in 4. sorgusundaki müşteri listesini gördün ve onayladın
--   3. ADIM 1'in 6. sorgusundaki view tanımını aşağıdakiyle
--      karşılaştırdın (bkz. AŞAĞIDAKİ UYARI)
--
-- GÜVENLİK: Bu dosya tek bir transaction'dır ve sonunda kendini
-- doğrular. Doğrulama başarısız olursa `raise exception` ile
-- TAMAMI OTOMATİK GERİ ALINIR. Yarım kalmış bir durum oluşamaz.
--
-- Hiçbir satır silinmez. Hiçbir tutar değişmez.
-- Tek veri değişikliği: durum 'aktif' -> 'onaylandi'.
-- ============================================================
--
-- ⚠️ VIEW UYARISI — ÇALIŞTIRMADAN ÖNCE OKU
-- Aşağıdaki view tanımı repodaki schema.sql'e DEĞİL, beklenen
-- prod yapısına dayanıyor. ADIM 1'in 6. sorgusunun çıktısıyla
-- satır satır karşılaştır. İzin verilen TEK iki fark:
--     1. where durum = 'aktif'   ->   where durum <> 'iptal'
--     2. acilis_bakiyesi kolonunun çıktıda bulunması
-- Prod'da burada olmayan başka bir kolon/join varsa onu buraya
-- ekle. Eklemezsen doğrulama zaten patlar ve geri alır — ama
-- boşuna uğraşmamak için önce bak.
-- ============================================================

begin;

-- ---- A1: iki durumlu modele geç ------------------------------
update teklifler set durum = 'onaylandi' where durum = 'aktif';

alter table teklifler drop constraint if exists teklifler_durum_check;
alter table teklifler alter column durum set default 'onaylandi';
alter table teklifler add constraint teklifler_durum_check
  check (durum in ('onaylandi', 'iptal'));


-- ---- A2: view artık iptal edilmemiş HER belgeyi borç sayar ----
drop view if exists musteri_cari;
create view musteri_cari as
select
  m.id, m.musteri_adi, m.adres, m.telefon, m.aktif,
  coalesce(m.acilis_bakiyesi, 0)  as acilis_bakiyesi,
  coalesce(t.toplam_borc, 0)      as toplam_borc,
  coalesce(th.toplam_tahsilat, 0) as toplam_tahsilat,
  coalesce(m.acilis_bakiyesi, 0)
    + coalesce(t.toplam_borc, 0)
    - coalesce(th.toplam_tahsilat, 0) as bakiye
from musteriler m
left join (
  select musteri_id, sum(genel_toplam) as toplam_borc
  from teklifler where durum <> 'iptal'
  group by musteri_id
) t on t.musteri_id = m.id
left join (
  select musteri_id, sum(tutar) as toplam_tahsilat
  from tahsilatlar where iptal = false
  group by musteri_id
) th on th.musteri_id = m.id;


-- ---- A3: OTOMATİK DOĞRULAMA (başarısızsa her şeyi geri alır) --
-- Kural: her müşterinin bakiye farkı, o müşterinin migration
-- ÖNCESİNDE 'onaylandi' olan belgelerinin toplamına TAM EŞİT olmalı.
-- Tek kuruş sapma = açıklanamayan değişiklik = geri al.
do $$
declare
  hatali_sayisi int;
  ornek text;
begin
  with beklenen as (
    select musteri_id, sum(genel_toplam) as tutar
    from _migration_onaylandi_snapshot
    group by musteri_id
  ),
  karsilastirma as (
    select s.musteri_adi,
           c.bakiye - s.bakiye        as gerceklesen_fark,
           coalesce(b.tutar, 0)       as beklenen_fark
    from _migration_bakiye_snapshot s
    join musteri_cari c on c.id = s.id
    left join beklenen b on b.musteri_id = s.id
  )
  select count(*),
         string_agg(musteri_adi || ' (beklenen ' || beklenen_fark ||
                    ', gerçekleşen ' || gerceklesen_fark || ')', '; ')
    into hatali_sayisi, ornek
  from karsilastirma
  where gerceklesen_fark <> beklenen_fark;

  if hatali_sayisi > 0 then
    raise exception E'A3 DOGRULAMA BASARISIZ — HICBIR DEGISIKLIK YAPILMADI.\n'
                    '% musteride aciklanamayan bakiye farki var.\n'
                    'Ornekler: %\n'
                    'Muhtemel sebep: yukaridaki view tanimi prod''daki view ile '
                    'ayni degil (ADIM 1 sorgu 6 ile karsilastir).',
                    hatali_sayisi, left(coalesce(ornek, '-'), 800);
  end if;

  raise notice 'A3 DOGRULAMA GECTI — tum bakiye farklari aciklanabilir.';
end $$;


-- ---- Sağlık kontrolü: sadece iki durum kalmalı ---------------
do $$
declare kalan int;
begin
  select count(*) into kalan from teklifler where durum not in ('onaylandi','iptal');
  if kalan > 0 then
    raise exception 'Beklenmeyen durum degeri olan % kayit var. Geri alindi.', kalan;
  end if;
end $$;

commit;


-- ============================================================
-- Commit sonrası: sonucu gözle gör (bu kısım salt okunur)
-- ============================================================
select durum, count(*) as adet, sum(genel_toplam) as toplam
from teklifler group by durum order by durum;

select s.musteri_adi,
       s.bakiye as onceki,
       c.bakiye as sonraki,
       c.bakiye - s.bakiye as fark
from _migration_bakiye_snapshot s
join musteri_cari c on c.id = s.id
where c.bakiye is distinct from s.bakiye
order by abs(c.bakiye - s.bakiye) desc;

-- Tutarların hiç değişmediğinin kanıtı:
-- bu sayı migration öncesiyle birebir aynı olmalı.
select count(*) as belge_sayisi, sum(genel_toplam) as tum_belgeler_toplami
from teklifler;
