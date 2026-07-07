# Quintral Insight

Plataforma de ciencia abierta sobre el **quintral** (*Tristerix corymbosus*),
planta hemiparásita del bosque esclerófilo de Chile central. Permite identificar
el árbol hospedero a partir de una foto usando IA, explorar un mapa
georreferenciado de avistamientos y aportar observaciones de ciencia ciudadana.

🌐 **Producción:** https://quintral.vercel.app

## Funcionalidades

- **Identificación con IA** — Subes fotos del ejemplar (corteza, hoja, árbol,
  fruto) y Claude Vision estima si es quintral, el hospedero probable, la
  confianza y la fenología.
- **Mapa georreferenciado** — Avistamientos sobre OpenStreetMap (react-leaflet),
  filtrables por cerro y por hospedero; el mapa se centra automáticamente sobre
  las observaciones cargadas.
- **Ciencia ciudadana** — Formulario abierto (sin registro) para aportar
  observaciones; el mapa se actualiza al instante.
- **Modo offline (PWA)** — Las observaciones creadas sin conexión se encolan
  localmente y se sincronizan al recuperar la red.
- **Perfil fitoquímico y evidencia antibacteriana** — Perfil de referencia por
  hospedero y sección de ensayo antibacteriano por bacteria.
- **Panel de administración** — Verificación y gestión de observaciones aportadas.

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15 (App Router) + React 19 + TypeScript |
| IA | `@anthropic-ai/sdk` — Claude Vision (`claude-opus-4-8`), solo en servidor |
| Datos | Supabase (Postgres + Storage) |
| Mapa | react-leaflet + OpenStreetMap |
| Tipografía | Spectral + Hanken Grotesk (`next/font`) |
| Tests | Vitest + Testing Library + jsdom |

## Desarrollo local

```bash
npm install
cp .env.local.example .env.local   # completa las 3 variables (ver abajo)
npm run dev                          # http://localhost:3000
```

### Variables de entorno

```
NEXT_PUBLIC_SUPABASE_URL=        # URL del proyecto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # clave anónima (pública) de Supabase
ANTHROPIC_API_KEY=               # clave de la API de Anthropic (SOLO servidor)
```

> `ANTHROPIC_API_KEY` se usa exclusivamente en la ruta `/api/identify`; nunca se
> expone al cliente.

## Base de datos (Supabase)

En el **SQL Editor** de Supabase, ejecuta en orden:

1. `supabase/migrations/0001_observaciones.sql` — crea la tabla `observaciones`
   y el bucket de Storage `fotos`.
2. `supabase/migrations/0002_lock_down_public_writes.sql` — endurece las
   políticas RLS de escritura pública.
3. `supabase/migrations/0003_admin.sql` — soporte del panel de administración
   (verificación de observaciones).
4. `supabase/seed.sql` — inserta avistamientos iniciales del Cerro Manquehue.

> `supabase/migrations/0004_fix_manquehue_coords.sql` solo corrige las
> coordenadas de datos ya sembrados con la versión antigua del seed; en una base
> nueva no es necesario ejecutarlo.

## Scripts

```bash
npm run dev     # servidor de desarrollo
npm run build   # build de producción
npm run start   # servir el build
npm run test    # suite de tests (Vitest)
```

## Estructura

```
src/
  app/
    layout.tsx            # fuentes y metadata
    page.tsx              # composición de la página
    globals.css           # sistema de diseño (tokens, componentes)
    admin/                # panel de administración
    api/                  # rutas de servidor (identify, admin, observaciones)
  components/             # Nav, Hero, IdentifySection, MapSection, MapaQuintral,
                          # ContributeForm, PrediccionSection, AntibacterianoSection,
                          # BibliotecaFito, CompararSection, gráficos y offline UI
  lib/                    # tipos, hospederos, parser IA, capa de datos,
                          # validación, helpers de subida, cola offline
supabase/                 # migraciones y seed
```

## Despliegue

Conectado a Vercel desde la rama **`master`**. Cada push a `master` dispara un
deploy de producción. Requiere las 3 variables de entorno configuradas en
Vercel (Settings → Environment Variables).
