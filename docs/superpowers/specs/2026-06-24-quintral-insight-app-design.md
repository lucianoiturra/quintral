# Quintral Insight — Diseño (v1)

**Fecha:** 2026-06-24
**Estado:** Aprobado, listo para plan de implementación

## Contexto

App web del proyecto científico-tecnológico sobre el **quintral** (*Tristerix corymbosus*),
planta hemiparásita nativa de Chile. El proyecto estudia cómo el **árbol hospedero**
(aromo, colliguay, litre, quillay) influye en la composición fitoquímica del quintral.

La app, "Quintral Insight", busca: difundir info del proyecto, mostrar las ubicaciones
georreferenciadas del quintral en un mapa, permitir identificar el hospedero a partir de
una foto, y dejar que la comunidad aporte nuevos registros a una base de datos
georreferenciada (ciencia ciudadana).

Existe un mockup (PDF) con 6 secciones y un prototipo previo hecho en Lovable.

## Decisiones tomadas

- **Identificación por foto:** API de visión general (Claude Vision), no modelo entrenado
  propio. Funciona sin dataset, precisión moderada, costo por foto. La IA nunca bloquea el
  aporte; el usuario puede confirmar el hospedero a mano.
- **Alcance v1:** core loop (mapa + ciencia ciudadana + identificación por foto). El
  comparador y la predicción fitoquímica quedan para v2 (dependen de datos de lab "en proceso").
- **Stack:** Next.js (App Router) + Supabase (Postgres + Storage), desplegado en Vercel.
- **Aportes:** totalmente abiertos — aparecen en el mapa al instante, sin cuenta ni moderación.
- **Idioma:** español (Chile). Una sola página larga con secciones ancladas, como el mockup.

## Arquitectura

```
Navegador (Next.js, React)
   │
   ├── /api/identify  ──►  Claude Vision API   (ANTHROPIC_API_KEY solo server-side)
   │
   └── Supabase JS  ──►  Postgres (observaciones)  +  Storage (fotos)
```

- Una sola app Next.js: frontend + rutas API en el mismo proyecto.
- El frontend lee/escribe en Supabase con la clave pública (anon); RLS permite `insert` y
  `select` en `observaciones` (aportes abiertos).
- La clave de la API de visión vive solo en la ruta de servidor `/api/identify`.

## Core loop (flujo foto → hospedero → mapa)

1. Usuario saca/sube foto en la sección "Identificación con IA".
2. El navegador la envía a `/api/identify`; Claude Vision responde estructurado:
   `{ es_quintral, hospedero_probable, confianza, fenologia, notas }`.
3. Se muestra el resultado. Botón **"Agregar al mapa"** precarga el formulario de aporte con
   hospedero + fenología + la foto.
4. La ubicación se obtiene automática (geolocalización del navegador o coordenadas EXIF de la
   foto); si no, entrada manual de lat/lng.
5. Al enviar: se guarda el registro en Supabase + se sube la foto a Storage; el punto aparece
   al instante en el mapa.

**Regla:** la IA nunca bloquea el aporte. Baja confianza, foto no-planta o fallo de API →
el usuario confirma el hospedero desde un selector manual. Esto también acumula dataset para
un eventual modelo propio.

## Secciones (v1)

1. **Hero / info del proyecto** — qué es el quintral, los hospederos, el proyecto.
2. **Identificación con IA** — subida de foto + resultado del análisis.
3. **Mapa georreferenciado** — react-leaflet + tiles gratuitos (OpenStreetMap / OpenTopoMap).
   Marcadores con color según hospedero; filtros por cerro (El Carbón / Manquehue / Todos) y
   por hospedero; popup con foto + datos. Sembrado con las 6 coordenadas reales del Cerro
   Manquehue del documento.
4. **Aportar observación** — formulario de ciencia ciudadana.

**Fuera de v1** (para cuando haya datos de lab): comparador fitoquímico y predicción
fitoquímica. Sus enlaces quedan en el menú marcados como "próximamente".

## Modelo de datos

Tabla `observaciones`:

| Campo               | Tipo        | Notas                                        |
|---------------------|-------------|----------------------------------------------|
| id                  | uuid        | PK                                           |
| nombre_observador   | text        | del formulario (sin cuenta)                  |
| lat                 | double      |                                              |
| lng                 | double      |                                              |
| hospedero           | text        | aromo / colliguay / litre / quillay / otro   |
| hospedero_otro      | text null   | si hospedero = otro                          |
| fenologia           | text        | estado/fenología del ejemplar                |
| altitud             | int null    | metros                                       |
| exposicion_solar    | text null   | norte / sur / etc.                           |
| foto_url            | text null   | ruta en Storage                              |
| resultado_ia        | jsonb null  | respuesta cruda de la IA                     |
| cerro               | text null   | El Carbón / Manquehue / otro                 |
| creado_en           | timestamptz | default now()                                |

Bucket `fotos` en Supabase Storage (lectura pública, escritura por anon).

Datos semilla: 6 coordenadas del Cerro Manquehue (del escrito tecnológico):
- -33.2129, -70.3416 (litre)
- -33.2125, -70.3418 (litre)
- -33.2124, -70.3416 (quillay)
- -33.2121, -70.3419 (quillay)
- -33.2117, -70.3426 (quillay)
- -33.2114, -70.3428 (quillay)

## Manejo de errores

- IA: foto que no es planta / baja confianza → mensaje "no estoy seguro, confirmá el
  hospedero" + selector manual. Timeout o error de API → continuar con entrada manual.
- Geolocalización denegada → entrada manual de lat/lng.
- Validación de formato y tamaño de imagen antes de enviar a la IA.

## Testing

- Unitarios: validación del formulario, parser de la respuesta de la IA, mapeo de colores
  por hospedero.
- La llamada a Claude se mockea en tests; una prueba de integración real detrás de un flag de
  entorno.
- Verificación manual: levantar la app, enviar un registro, verlo aparecer en el mapa.

## Notas de implementación

- Para la integración con Claude Vision, consultar la skill `claude-api` (modelo vigente con
  visión, forma de llamada, manejo de imágenes).
- No hay repositorio git inicializado todavía; conviene `git init` antes de empezar.
