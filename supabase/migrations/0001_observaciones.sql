create table if not exists observaciones (
  id uuid primary key default gen_random_uuid(),
  nombre_observador text not null,
  lat double precision not null,
  lng double precision not null,
  hospedero text not null,
  hospedero_otro text,
  fenologia text not null default '',
  altitud integer,
  exposicion_solar text,
  foto_url text,
  resultado_ia jsonb,
  cerro text,
  creado_en timestamptz not null default now()
);

alter table observaciones enable row level security;

-- Aportes abiertos: cualquiera puede leer e insertar.
create policy "lectura publica" on observaciones for select using (true);
create policy "insercion publica" on observaciones for insert with check (true);

-- Storage: bucket público de fotos (crear también desde el panel de Supabase).
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do nothing;

create policy "fotos lectura" on storage.objects for select using (bucket_id = 'fotos');
create policy "fotos subida" on storage.objects for insert with check (bucket_id = 'fotos');
