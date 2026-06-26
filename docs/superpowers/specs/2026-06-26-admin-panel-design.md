# Panel de Administración — Spec

**Fecha:** 2026-06-26
**Proyecto:** Quintral Insight

## Objetivo

Crear una página `/admin` protegida por contraseña que permita al administrador gestionar las observaciones ciudadanas: borrar, ocultar, editar, verificar y revisar el historial de acciones. Las observaciones verificadas muestran un badge en el mapa público; las ocultas desaparecen del mapa.

---

## Base de Datos

### Columnas nuevas en `observaciones`

| Columna | Tipo | Default | Descripción |
|---|---|---|---|
| `oculta` | `boolean` | `false` | Excluye la observación del mapa público |
| `verificada` | `boolean` | `false` | Habilita el badge "Verificado" en el mapa |
| `editado_en` | `timestamptz` | `null` | Timestamp de la última edición admin |
| `notas_admin` | `text` | `null` | Notas internas, nunca visibles al público |

### Nueva tabla `admin_log`

```sql
id             uuid         PK, default gen_random_uuid()
observacion_id uuid         FK → observaciones(id) ON DELETE SET NULL
accion         text         NOT NULL  -- 'ocultada' | 'mostrada' | 'verificada' | 'desverificada' | 'editada' | 'borrada'
detalle        jsonb                  -- snapshot de campos anteriores al editar
fecha          timestamptz  NOT NULL, default now()
```

RLS en `admin_log`: sin políticas públicas — solo accesible con service role key.

### Nuevas variables de entorno

| Variable | Uso |
|---|---|
| `ADMIN_PASSWORD` | Contraseña del panel admin (solo servidor) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio Supabase para operaciones admin (solo servidor) |

Ambas son secretos de servidor — nunca prefijo `NEXT_PUBLIC_`.

---

## Autenticación

- `POST /api/admin/login` recibe `{ password }`, compara con `ADMIN_PASSWORD`, y si coincide emite una cookie httpOnly firmada `admin_session` con valor derivado de la contraseña (hash SHA-256).
- `POST /api/admin/logout` elimina la cookie.
- Todas las rutas `/api/admin/*` verifican la cookie antes de ejecutar. Sin cookie válida: `401 Unauthorized`.
- La página `/admin` en el servidor lee la cookie; si no existe renderiza el formulario de login, si existe renderiza el panel.

---

## Página `/admin`

### Layout

```
┌──────────────────────────────────────────┐
│  Quintral Admin             [Cerrar sesión]│
├──────────────────────────────────────────┤
│  Filtros:                                 │
│  [Todas | Ocultas | Verificadas]          │
│  [Hospedero ▾]  [Cerro ▾]                │
├──────────────────────────────────────────┤
│  Tabla de observaciones                   │
│  # | Fecha | Observador | Hospedero |     │
│    | Cerro | Estado     | Acciones        │
│                                           │
│  Estado posible por fila:                 │
│  · "verificada"  · "oculta"  · "pendiente"│
│                                           │
│  Acciones por fila:                       │
│  [Editar] [Ocultar/Mostrar] [Borrar]      │
├──────────────────────────────────────────┤
│  Historial de acciones (admin_log)        │
│  2026-06-25 · Observación #3 · editada   │
│  2026-06-24 · Observación #7 · borrada   │
└──────────────────────────────────────────┘
```

### Acciones

| Acción | Comportamiento |
|---|---|
| **Editar** | Expande fila inline con inputs para: hospedero, fenología, cerro, altitud, exposición solar, notas_admin. Guarda con `PATCH /api/admin/observaciones/[id]`. Registra en `admin_log` con `detalle` = snapshot JSON de los campos anteriores. |
| **Ocultar / Mostrar** | Toggle de `oculta` via botón 👁 en columna Acciones. Llama `PATCH /api/admin/observaciones/[id]`. Registra `'ocultada'` o `'mostrada'` en `admin_log`. |
| **Verificar / Desverificar** | Toggle de `verificada` via botón ✓ en columna Acciones (junto a Ocultar y Borrar). Registra `'verificada'` o `'desverificada'` en `admin_log`. |
| **Borrar** | Confirmación inline ("¿Eliminar este registro?"). Guarda snapshot completo de la observación en `admin_log.detalle` antes de eliminar. Llama `DELETE /api/admin/observaciones/[id]`. El log queda con `observacion_id = null` (FK `ON DELETE SET NULL`) pero el `detalle` conserva todos los datos. |

---

## Rutas API Admin

Todas requieren cookie `admin_session` válida. Usan `SUPABASE_SERVICE_ROLE_KEY`.

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/admin/login` | Autenticar y emitir cookie |
| `POST` | `/api/admin/logout` | Invalidar cookie |
| `GET` | `/api/admin/observaciones` | Listar todas (incluye ocultas) |
| `PATCH` | `/api/admin/observaciones/[id]` | Editar campos o togglear oculta/verificada |
| `DELETE` | `/api/admin/observaciones/[id]` | Borrar permanentemente |

---

## Cambios en el Mapa Público

### `fetchObservations` (src/lib/observations.ts)

Agregar filtro `.eq('oculta', false)` al query existente. Las observaciones nuevas entran con `oculta=false` por defecto, por lo que no se requiere ningún cambio en el formulario de aportes.

### `MapaQuintral` (src/components/MapaQuintral.tsx)

En el popup de cada marcador, si `verificada === true` mostrar:
- Etiqueta "✓ Verificado" en texto verde dentro del popup.
- El `CircleMarker` tiene `weight: 2` por defecto; para observaciones verificadas usar `weight: 3` y `color` más brillante para distinguirlas.

### Tipo `Observation` (src/lib/types.ts)

Agregar campos:
```ts
oculta: boolean
verificada: boolean
notas_admin?: string | null
editado_en?: string | null
```

---

## Archivos a Crear / Modificar

### Nuevos
- `supabase/migrations/0002_admin.sql` — columnas + tabla admin_log + RLS
- `src/app/admin/page.tsx` — página admin (Server Component con auth check)
- `src/app/admin/LoginForm.tsx` — formulario de login client component
- `src/app/admin/AdminPanel.tsx` — panel principal client component
- `src/app/api/admin/login/route.ts`
- `src/app/api/admin/logout/route.ts`
- `src/app/api/admin/observaciones/route.ts` (GET)
- `src/app/api/admin/observaciones/[id]/route.ts` (PATCH, DELETE)
- `src/lib/adminAuth.ts` — helper para verificar cookie admin

### Modificados
- `src/lib/types.ts` — campos nuevos en `Observation`
- `src/lib/observations.ts` — filtro `oculta=false` en `fetchObservations`
- `src/components/MapaQuintral.tsx` — badge verificado en popup

---

## Fuera de Alcance

- Múltiples administradores o roles
- Notificaciones por email al observador
- Exportar datos a CSV
- Moderación automática con IA
