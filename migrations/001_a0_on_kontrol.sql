-- ============================================================
-- ADIM 1 / A0 — ÖN KONTROL
-- Supabase → SQL Editor → yeni query → hepsini yapıştır → Run
--
-- Bu dosya HİÇBİR ŞEYİ DEĞİŞTİRMEZ.
-- Sadece okur ve iki adet "fotoğraf" tablosu oluşturur.
-- Çıktıları oku, sonra ADIM 2'ye geç.
-- ============================================================

-- ---- 1) Şu anki durum dağılımı --------------------------------
select durum, count(*) as adet, sum(genel_toplam) as toplam
from teklifler
group by durum
order by durum;


-- ---- 2) FOTOĞRAF A: migration öncesi bakiyeler ----------------
-- (ADIM 2'deki otomatik doğrulama bu tabloyu kullanacak — SİLME)
drop table if exists _migration_bakiye_snapshot;
create table _migration_bakiye_snapshot as
select id, musteri_adi, toplam_borc, toplam_tahsilat, bakiye, now() as alindi
from musteri_cari;


-- ---- 3) FOTOĞRAF B: hâlihazırda 'onaylandi' olan belgeler -----
-- Migration'dan SONRA 'aktif' olanlar da 'onaylandi' olacağı için,
-- "hangi belgeler zaten onaylandi'ydı" bilgisi ancak ŞİMDİ alınabilir.
-- Doğrulamanın matematiksel dayanağı bu tablodur — SİLME.
drop table if exists _migration_onaylandi_snapshot;
create table _migration_onaylandi_snapshot as
select id, musteri_id, genel_toplam
from teklifler
where durum = 'onaylandi';


-- ---- 4) Kim etkilenecek, ne kadar? ----------------------------
-- Bu müşterilerin bakiyesi migration sonrası ARTACAK.
-- Bu bir DÜZELTMEDİR: bu belgeler şu an cari bakiyeden hatalı
-- şekilde dışlanıyor. Yine de listeyi görüp onaylaman gerekiyor.
select
  m.musteri_adi,
  count(*)                        as etkilenen_belge,
  sum(o.genel_toplam)             as bakiyeye_eklenecek,
  c.bakiye                        as simdiki_bakiye,
  c.bakiye + sum(o.genel_toplam)  as migration_sonrasi_bakiye
from _migration_onaylandi_snapshot o
join musteriler m   on m.id = o.musteri_id
join musteri_cari c on c.id = o.musteri_id
group by m.musteri_adi, c.bakiye
order by bakiyeye_eklenecek desc;


-- ---- 5) Toplam etki (commit mesajına yazılacak) ---------------
select
  count(distinct musteri_id) as etkilenen_musteri_sayisi,
  count(*)                   as etkilenen_belge_sayisi,
  coalesce(sum(genel_toplam), 0) as toplam_bakiye_farki
from _migration_onaylandi_snapshot;


-- ---- 6) ⚠️ ZORUNLU: prod'daki mevcut view tanımı --------------
-- ADIM 2'yi çalıştırmadan ÖNCE bu çıktıyı oku.
-- Repodaki schema.sql prod'u yansıtmıyor.
select pg_get_viewdef('musteri_cari'::regclass, true) as mevcut_view_tanimi;
