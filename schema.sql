-- ============================================
-- ESCA FOOD MUHASEBE v2 — Supabase SQL Schema
-- ============================================

-- Müşteriler
create table musteriler (
  id uuid primary key default gen_random_uuid(),
  musteri_adi text not null,
  adres text,
  telefon text,
  email text,
  notlar text,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

-- Ürünler
create table urunler (
  id uuid primary key default gen_random_uuid(),
  urun_adi text not null,
  barkod text unique,
  liste_fiyati numeric(12,2) not null default 0,
  birim text not null default 'adet',
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

-- Teklif no sequence (güvenli, race condition yok)
create sequence teklif_no_seq start 10001;

-- Teklifler
create table teklifler (
  id uuid primary key default gen_random_uuid(),
  teklif_no int not null default nextval('teklif_no_seq') unique,
  musteri_id uuid not null references musteriler(id),
  durum text not null default 'aktif' check (durum in ('aktif', 'iptal', 'onaylandi')),
  iskonto_orani numeric(5,2) not null default 0,
  -- Toplamlar hesaplanmış değil, kaydedilmiş (audit trail için)
  ara_toplam numeric(12,2) not null default 0,
  iskonto_tutar numeric(12,2) not null default 0,
  genel_toplam numeric(12,2) not null default 0,
  notlar text,
  tarih timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Teklif kalemleri (ürün snapshot ile — fiyat değişse eski teklif bozulmaz)
create table teklif_kalemleri (
  id uuid primary key default gen_random_uuid(),
  teklif_id uuid not null references teklifler(id) on delete cascade,
  urun_id uuid references urunler(id),        -- null olabilir: silinmiş veya serbest kalem
  urun_adi text not null,                      -- snapshot
  barkod text,                                 -- snapshot
  birim_fiyat numeric(12,2) not null,          -- snapshot
  miktar numeric(10,3) not null default 1,
  toplam numeric(12,2) not null,
  sira int not null default 0
);

-- Tahsilat no sequence
create sequence tahsilat_no_seq start 10001;

-- Tahsilatlar
create table tahsilatlar (
  id uuid primary key default gen_random_uuid(),
  tahsilat_no int not null default nextval('tahsilat_no_seq') unique,
  musteri_id uuid not null references musteriler(id),
  tutar numeric(12,2) not null,
  tahsilat_turu text not null default 'nakit' check (tahsilat_turu in ('nakit', 'eft_havale', 'cek', 'senet', 'diger')),
  aciklama text,
  iptal boolean not null default false,
  tarih timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ============================================
-- VIEW: Müşteri cari bakiyesi (hiç bozulmaz)
-- ============================================
create or replace view musteri_cari as
select
  m.id,
  m.musteri_adi,
  m.adres,
  m.telefon,
  m.aktif,
  coalesce(t.toplam_borc, 0)      as toplam_borc,
  coalesce(th.toplam_tahsilat, 0) as toplam_tahsilat,
  coalesce(t.toplam_borc, 0) - coalesce(th.toplam_tahsilat, 0) as bakiye
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

-- ============================================
-- RLS — Tek kullanıcı: auth ile erişim
-- ============================================
alter table musteriler      enable row level security;
alter table urunler         enable row level security;
alter table teklifler       enable row level security;
alter table teklif_kalemleri enable row level security;
alter table tahsilatlar     enable row level security;

-- Authenticated kullanıcı her şeyi yapabilir
create policy "authenticated_all" on musteriler       for all to authenticated using (true) with check (true);
create policy "authenticated_all" on urunler          for all to authenticated using (true) with check (true);
create policy "authenticated_all" on teklifler        for all to authenticated using (true) with check (true);
create policy "authenticated_all" on teklif_kalemleri for all to authenticated using (true) with check (true);
create policy "authenticated_all" on tahsilatlar      for all to authenticated using (true) with check (true);

-- ============================================
-- İndeksler
-- ============================================
create index on teklifler (musteri_id);
create index on teklifler (tarih desc);
create index on teklifler (durum);
create index on tahsilatlar (musteri_id);
create index on tahsilatlar (tarih desc);
create index on teklif_kalemleri (teklif_id);
create index on urunler (urun_adi);
create index on urunler (barkod);
