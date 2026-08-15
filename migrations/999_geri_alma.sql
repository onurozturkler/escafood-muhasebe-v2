-- ============================================================
-- ACİL DURUM — ADIM 2 commit EDİLDİKTEN SONRA geri alma
--
-- Normalde buna ihtiyacın olmaz: ADIM 2 kendini doğruluyor ve
-- doğrulama geçmezse zaten hiçbir şey değişmiyor.
-- Bu dosya, commit sonrası bir sorun fark edersen diye.
--
-- ⚠️ SINIRLI GERİ ALMA: bu script, migration ÖNCESİNDE zaten
-- 'onaylandi' olan belgeleri de 'aktif' yapar — yani orijinal
-- durumu birebir geri getirmez. _migration_onaylandi_snapshot
-- tablosu duruyorsa aşağıdaki "TAM GERİ ALMA" bloğunu kullan.
-- ============================================================

begin;

-- --- TAM GERİ ALMA (snapshot tabloları duruyorsa — TERCİH EDİLEN) ---
alter table teklifler drop constraint if exists teklifler_durum_check;

update teklifler set durum = 'aktif'
where durum = 'onaylandi'
  and id not in (select id from _migration_onaylandi_snapshot);

alter table teklifler alter column durum set default 'aktif';
alter table teklifler add constraint teklifler_durum_check
  check (durum in ('aktif', 'iptal', 'onaylandi'));

-- --- View'ı eski haline döndür ---
-- ⚠️ Aşağıdaki tanım ADIM 1'in 6. sorgusundan aldığın ÇIKTIYLA
--    değiştirilmeli. Aşağıdaki sadece beklenen haldir.
drop view if exists musteri_cari;
create view musteri_cari as
select
  m.id, m.musteri_adi, m.adres, m.telefon, m.aktif,
  coalesce(t.toplam_borc, 0)      as toplam_borc,
  coalesce(th.toplam_tahsilat, 0) as toplam_tahsilat,
  coalesce(m.acilis_bakiyesi, 0)
    + coalesce(t.toplam_borc, 0)
    - coalesce(th.toplam_tahsilat, 0) as bakiye
from musteriler m
left join (
  select musteri_id, sum(genel_toplam) as toplam_borc
  from teklifler where durum = 'aktif'
  group by musteri_id
) t on t.musteri_id = m.id
left join (
  select musteri_id, sum(tutar) as toplam_tahsilat
  from tahsilatlar where iptal = false
  group by musteri_id
) th on th.musteri_id = m.id;

-- Bakiyeler snapshot'takiyle aynı mı? Değilse commit ETME.
do $$
declare hatali int;
begin
  select count(*) into hatali
  from _migration_bakiye_snapshot s
  join musteri_cari c on c.id = s.id
  where c.bakiye is distinct from s.bakiye;
  if hatali > 0 then
    raise exception 'Geri alma sonrasi % musteride bakiye snapshot ile uyusmuyor. Geri alindi.', hatali;
  end if;
  raise notice 'Geri alma dogrulandi — bakiyeler migration oncesi haliyle ayni.';
end $$;

commit;

-- Not: kod tarafını da geri almayı unutma (eski commit'e dön),
-- yoksa arayüz 'aktif' durumunu tanımaz.
