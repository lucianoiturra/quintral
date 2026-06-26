alter table observaciones
  alter column nombre_observador set not null,
  alter column hospedero set not null,
  alter column fenologia set not null;

alter table observaciones
  add constraint observaciones_nombre_observador_len
    check (char_length(nombre_observador) between 1 and 80) not valid,
  add constraint observaciones_lat_range
    check (lat between -90 and 90) not valid,
  add constraint observaciones_lng_range
    check (lng between -180 and 180) not valid,
  add constraint observaciones_hospedero_check
    check (
      hospedero in (
        'alamo', 'aromo', 'arrayan', 'barraco', 'boldo', 'chacay', 'coihue',
        'colliguay', 'corcolen', 'crucero', 'eulychnia-breviflora',
        'eulychnia-castanea', 'huingan', 'litre', 'maqui', 'maiten', 'manzano',
        'nothofagus-nitida', 'olivo', 'peral', 'peumo', 'pingo-pingo',
        'platano-oriental', 'quillay', 'quisco', 'quisco-coquimbano',
        'quisco-litoralis', 'quisco-skottsbergii', 'quisquito', 'sauce', 'otro'
      )
    ) not valid,
  add constraint observaciones_hospedero_otro_required
    check (
      (hospedero = 'otro' and hospedero_otro is not null and char_length(trim(hospedero_otro)) between 1 and 120)
      or (hospedero <> 'otro' and hospedero_otro is null)
    ) not valid,
  add constraint observaciones_fenologia_len
    check (char_length(fenologia) between 1 and 120) not valid,
  add constraint observaciones_altitud_range
    check (altitud is null or altitud between -500 and 10000) not valid,
  add constraint observaciones_exposicion_solar_len
    check (exposicion_solar is null or char_length(exposicion_solar) <= 80) not valid,
  add constraint observaciones_cerro_len
    check (cerro is null or char_length(cerro) <= 120) not valid,
  add constraint observaciones_foto_url_bucket
    check (
      foto_url is null
      or foto_url like '%' || '/storage/v1/object/public/fotos/%'
    ) not valid;

drop policy if exists "insercion publica" on observaciones;
drop policy if exists "fotos subida" on storage.objects;
drop policy if exists "fotos lectura" on storage.objects;
drop policy if exists "lectura publica fotos" on storage.objects;

create policy "lectura publica fotos" on storage.objects
for select using (bucket_id = 'fotos');
