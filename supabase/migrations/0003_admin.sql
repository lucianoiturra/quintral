alter table observaciones
  add column if not exists oculta boolean not null default false,
  add column if not exists verificada boolean not null default false,
  add column if not exists editado_en timestamptz,
  add column if not exists notas_admin text;

create table if not exists admin_log (
  id uuid primary key default gen_random_uuid(),
  observacion_id uuid references observaciones(id) on delete set null,
  accion text not null,
  detalle jsonb,
  fecha timestamptz not null default now()
);

alter table admin_log enable row level security;
