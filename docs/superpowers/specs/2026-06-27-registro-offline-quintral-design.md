# Registro offline de quintrales (cerros sin señal)

Fecha: 2026-06-27
Estado: aprobado (diseño), pendiente de plan de implementación

## Problema

Muchos quintrales se registran en cerros donde **no hay señal de celular**. Hoy la app
([ContributeForm.tsx](../../../src/components/ContributeForm.tsx)) es una web normal: sin
datos no abre, el envío y la subida de foto van directo a Supabase y fallan, y la altitud
que entrega el GPS ni siquiera se lee.

Dato clave: el **GPS funciona sin señal de celular** (recibe la posición de los satélites).
El problema no es obtener coordenadas en el cerro, sino: (1) que la app **cargue** offline,
(2) que el registro se **guarde** sin conexión y se **suba después**, y (3) **capturar la
altitud**.

## Decisiones tomadas

- Uso en terreno: las personas registran **con la app ahí mismo** (caso más exigente).
- Captura offline: **foto + todos los datos**, guardado local y subida posterior.
- Altitud: **precisa** → guardar altitud GPS offline como respaldo y **corregirla con un
  servicio de elevación** al sincronizar.
- Enfoque elegido (Opción A): **PWA instalable + cola local en IndexedDB + sincronización
  al volver la señal**. Se descartó Background Sync (Opción C) porque iOS/Safari no la
  soporta; queda como mejora futura.

## Arquitectura

Patrón **offline-first**: *todo* registro se guarda primero en el teléfono (IndexedDB) y
luego se intenta subir. Así no se pierde ningún dato y no dependemos de "detectar" si hay
conexión.

Piezas nuevas:

- **PWA (Serwist / `@serwist/next`):** `src/app/sw.ts` + `public/manifest.webmanifest` +
  envoltura en [next.config.mjs](../../../next.config.mjs). La app se instala en la pantalla
  de inicio y abre sin señal (service worker cachea el *app shell* y assets).
- **Almacén local** `src/lib/offline/db.ts` (librería `idb`): object store
  `observaciones_pendientes` con la forma:
  `{ id, payload, fotoBlob, altitudGps, precision, estado, error, creadoEn }`
  donde `estado ∈ {"pendiente", "subiendo", "error"}` y `payload` es el cuerpo que hoy
  recibe `createObservation` (sin `altitud` final ni `fotoUrl`, que se resuelven al subir).
- **Gestor de sincronización** `src/lib/offline/sync.ts`: recorre la cola y sube cada
  pendiente. Se dispara con el evento `online`, al abrir la app, y con un botón manual.
- **Endpoint de elevación** `src/app/api/elevation/route.ts`: proxy server-side a la API
  gratuita de Open-Meteo
  (`https://api.open-meteo.com/v1/elevation?latitude=..&longitude=..`, sin API key).
  Recibe lat/lng y devuelve la altitud del terreno.
- **Cambios en [ContributeForm.tsx](../../../src/components/ContributeForm.tsx):** capturar
  altitud GPS + precisión, guardar en la cola en vez de enviar directo, y mostrar el estado
  de pendientes / sincronización.
- **Indicador de conexión** en [Nav.tsx](../../../src/components/Nav.tsx).

## Flujo de datos

**En el cerro (sin señal):**

1. "Usar mi ubicación" → `getCurrentPosition` entrega `latitude`, `longitude`,
   `altitude` (altitud GPS), `accuracy`, `altitudeAccuracy`. Se guardan lat/lng/altitudGps/
   precisión.
2. Saca foto (input de cámara) → queda como `Blob`/`File`.
3. "Enviar" → se valida y se guarda en IndexedDB con estado `pendiente`. Mensaje:
   *"Guardado. Se subirá al volver la señal."*

**Al volver la señal** (evento `online`, al abrir la app, o botón "Sincronizar ahora"),
por cada pendiente:

1. Marca `subiendo`.
2. Sube la foto (`uploadFoto(fotoBlob)`).
3. Llama `/api/elevation` con lat/lng.
4. `altitud final = elevación del servicio ?? altitudGps` (respaldo si la API falla).
5. `createObservation(payload + fotoUrl + altitud)`.
6. Borra el pendiente de la cola y agrega la observación al mapa (`onCreated`).

## Manejo de errores

- **GPS falla** → mensaje + ingreso manual de coordenadas (como hoy).
- **Sin señal al enviar** → no es error: el registro queda guardado en `pendiente`.
- **Falla la subida de un registro** → queda en estado `error` con el detalle y reintenta
  en la próxima sincronización; **no bloquea a los demás** pendientes.
- **Falla la API de elevación** → usa `altitudGps` como respaldo (por eso se guardan ambas).
- **Foto pesada** → se reutiliza la validación de tamaño por imagen ya existente.
- **Permiso de ubicación denegado** → mensaje explicando cómo activarlo (y que el GPS no
  necesita datos).

## UX/UI — guiar al usuario sin señal

Cubre tres momentos:

**Antes de ir (preparación):**
- Checklist visible en la sección de aportar: *"¿Vas a un lugar sin señal? 1) Instala la
  app. 2) Ábrela una vez con señal para que quede lista. 3) Activa el permiso de
  ubicación."* (La app debe haberse abierto antes con datos para quedar cacheada.)
- Botón/banner "Instalar app" usando el evento `beforeinstallprompt` cuando el navegador
  lo ofrezca.

**En terreno (offline):**
- Indicador de conexión siempre visible ("Sin conexión") en el Nav.
- Texto de tranquilidad junto a Enviar cuando está offline: *"Sin señal: tu registro se
  guardará y se subirá solo al volver la conexión."*
- Si la altitud GPS viene vacía o muy imprecisa: *"Altitud aproximada; se afinará al
  sincronizar."*

**Después de guardar / al volver la señal:**
- Confirmación: *"✓ Guardado en tu teléfono. Pendientes de subir: N."*
- Panel de pendientes persistente (miniatura de foto + estado) con botón
  **"Sincronizar ahora"**.
- Al recuperar señal: *"Subiendo N observaciones…"* → *"✓ N subidas al mapa"*; las que
  fallan quedan marcadas con su error y opción de reintentar.

## Pruebas (Vitest, ya configurado)

- **Almacén local** (`db.ts`): agregar / listar / borrar pendientes; persistencia de la
  forma del registro incluyendo el blob.
- **Sincronización** (`sync.ts`): con `uploadFoto`, `createObservation` y el `fetch` de
  elevación *mockeados* → verifica el orden de pasos, el **respaldo de altitud** cuando la
  API de elevación falla, y que el fallo de un registro **no bota** el resto de la cola.

## Fuera de alcance (futuro)

- Background Sync / Periodic Sync (subir con la app cerrada) — no soportado en iOS.
- Identificación con IA en terreno (requiere señal; se hace al sincronizar o después).
- Columnas nuevas en Supabase para guardar **precisión GPS** y **fuente de la altitud**
  (GPS vs. modelo de elevación): útil para el análisis científico, pero obliga a migrar el
  esquema. Decidir más adelante.
