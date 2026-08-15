-- ============================================================
-- ADIM 0 — ÜCRETSİZ YEDEK
--
-- Supabase'in ücretli "Backups" özelliğine gerek YOK.
-- Bu script, verinin bir kopyasını aynı veritabanının içinde
-- ayrı tablolara çıkarır. Hiçbir şey silmez, hiçbir şey değiştirir.
--
-- Supabase → SQL Editor → New query → hepsini yapıştır → Run
-- ============================================================

-- Eski yedek varsa temizle (yedeğin yedeği anlamsız)
drop table if exists yedek_musteriler;
drop table if exists yedek_teklifler;
drop table if exists yedek_teklif_kalemleri;
drop table if exists yedek_tahsilatlar;

-- Verinin birebir kopyası
create table yedek_musteriler        as select * from musteriler;
create table yedek_teklifler         as select * from teklifler;
create table yedek_teklif_kalemleri  as select * from teklif_kalemleri;
create table yedek_tahsilatlar       as select * from tahsilatlar;

-- Kopyalandığını kanıtla: soldaki ve sağdaki sayılar birebir aynı olmalı
select 'musteriler'       as tablo, (select count(*) from musteriler)       as canli, (select count(*) from yedek_musteriler)       as yedek
union all
select 'teklifler',              (select count(*) from teklifler),              (select count(*) from yedek_teklifler)
union all
select 'teklif_kalemleri',       (select count(*) from teklif_kalemleri),       (select count(*) from yedek_teklif_kalemleri)
union all
select 'tahsilatlar',            (select count(*) from tahsilatlar),            (select count(*) from yedek_tahsilatlar);

-- Tutarların da kopyalandığını kanıtla: bu iki sayı birebir aynı olmalı
select
  (select coalesce(sum(genel_toplam),0) from teklifler)       as canli_toplam,
  (select coalesce(sum(genel_toplam),0) from yedek_teklifler) as yedek_toplam;


-- ============================================================
-- BUNLARI SİLME. İşin bitip her şeyin doğru olduğundan emin
-- olduktan sonra (birkaç gün sonra) şu komutla silebilirsin:
--
--   drop table yedek_musteriler, yedek_teklifler,
--              yedek_teklif_kalemleri, yedek_tahsilatlar;
--
-- ============================================================
-- ACİL DURUM: her şey ters gitti, veriyi yedekten geri istiyorum
-- ------------------------------------------------------------
-- AŞAĞIYI ŞU AN ÇALIŞTIRMA. Sadece felaket anında, tek tek.
--
-- begin;
--   -- sıra önemli: önce çocuk tablolar
--   delete from teklif_kalemleri;
--   delete from tahsilatlar;
--   delete from teklifler;
--   delete from musteriler;
--   insert into musteriler       select * from yedek_musteriler;
--   insert into teklifler        select * from yedek_teklifler;
--   insert into teklif_kalemleri select * from yedek_teklif_kalemleri;
--   insert into tahsilatlar      select * from yedek_tahsilatlar;
-- commit;
-- ============================================================
