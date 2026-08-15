# A4 — `schema.sql`'i gerçek şemayla senkronize et

**Bu adımı ben yapamadım: prod veritabanına erişimim yok.**
`schema.sql` şu an tahmin içeriyor; tahminle güncellemek onu daha az
yanlış ama hâlâ yalancı yapar. Gerçek dökümü sen almalısın.

## Yöntem 1 — `pg_dump` (tercih edilen)

Supabase → Project Settings → Database → Connection string (URI, direct).

```bash
pg_dump "postgresql://postgres:<PAROLA>@<HOST>:5432/postgres" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --schema=public \
  > schema.sql
```

## Yöntem 2 — Supabase CLI

```bash
supabase db dump --db-url "postgresql://..." -f schema.sql
```

## Yöntem 3 — SQL Editor'den parça parça

Erişim yoksa en azından şunları çalıştırıp çıktıları `schema.sql`'e işle:

```sql
-- Kolonlar
select table_name, column_name, data_type, column_default, is_nullable
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;

-- Constraint'ler
select conrelid::regclass as tablo, conname, pg_get_constraintdef(oid)
from pg_constraint
where connamespace = 'public'::regnamespace
order by 1, 2;

-- View'lar
select viewname, pg_get_viewdef(viewname::regclass, true)
from pg_views where schemaname = 'public';

-- RLS politikaları (DOKUNMA, sadece kaydet)
select tablename, policyname, cmd, qual, with_check
from pg_policies where schemaname = 'public';

-- İndeksler
select tablename, indexdef from pg_indexes where schemaname = 'public' order by 1;
```

## Bilinen eksikler (asgari)

Bu ikisinin prod'da olduğu, koddan kesin olarak biliniyor ama
`schema.sql`'de yok:

- `musteriler.acilis_bakiyesi` — `musteriler/[id]/page.tsx` ve
  `MusterilerClient.tsx` bu kolonu okuyor/yazıyor
- `musteri_cari` view'ının `acilis_bakiyesi`'ni bakiyeye ekleyen hali

Başka neyin farklı olduğunu ancak gerçek döküm gösterir.
