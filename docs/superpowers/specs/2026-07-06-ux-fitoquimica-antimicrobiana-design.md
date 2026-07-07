# Rediseño UX — Biblioteca fitoquímica y Evidencia antimicrobiana

**Fecha:** 2026-07-06
**Componentes:** `BibliotecaFito.tsx`, `EvidenciaAntimicrobiana.tsx` (+ datos y CSS asociados)

## Problema

Ambas secciones son muros de texto: párrafos largos y listas con viñetas apiladas.
Cuesta escanearlas y no dejan un mensaje memorable. Es un proyecto escolar de
ciencias cuya audiencia es doble (profes/jurado **y** compañeros/público general),
así que necesita funcionar en dos niveles: **mensaje simple y visual arriba,
detalle científico disponible al expandir** (divulgación progresiva).

## Objetivo

Reducir la carga de lectura y resaltar el mensaje clave de cada sección **sin
eliminar nada del contenido científico** — solo reorganizar la jerarquía.

## Decisiones de diseño (validadas con maquetas)

Identidad visual elegida: **estilo sobrio "B"** — creíble y científico, sin emoji,
acento de familia por color, chips con contorno. Se apoya en los tokens reales del
proyecto (`globals.css`): verde = `--forest` / `--forest-bright`, superficies
`--surface`, texto `--ink` / `--ink-soft`, bordes `--line`, radios `--r-*`.

### 1. Biblioteca fitoquímica

**a) Matriz-panorama (nuevo, arriba de las fichas).** Tabla compacta
*compuesto × propiedad* con **check verde (✓)** donde el compuesto tiene esa
propiedad; celdas sin propiedad muestran un punto tenue. 6 filas × 7 columnas
canónicas. Encabezado de columnas abreviado; primera columna (nombre) fija
(`position: sticky; left: 0`) y contenedor con `overflow-x: auto` para móvil.
Debajo de la tabla, una nota-insight: *"casi todos son antioxidantes,
antiinflamatorios y antimicrobianos"*.

Las columnas normalizan sinónimos de los datos:
- **Antioxidante**
- **Antiinflamatoria**
- **Antimicrobiana** (incluye "antibacteriana")
- **Antifúngica**
- **Antivírica**
- **Anticancerígena** (incluye "antitumoral")
- **Cardio** (incluye "cardioprotectora", "cardiovascular", "cardiotónica")

Propiedades singulares que no entran en la matriz (neuroprotectora,
antiparasitaria, antidiabética, colesterol LDL, inmunológico) siguen visibles en la
ficha detallada.

Marcas de la matriz (✓ = presente):

| Compuesto   | Antiox | Antiinf | Antimicr | Antifúng | Antivír | Anticanc | Cardio |
|-------------|:------:|:-------:|:--------:|:--------:|:-------:|:--------:|:------:|
| Polifenoles |   ✓    |    ✓    |    ✓     |          |         |    ✓     |   ✓    |
| Flavonoides |   ✓    |    ✓    |    ✓     |          |    ✓    |          |   ✓    |
| Terpenoides |        |    ✓    |    ✓     |    ✓     |         |    ✓     |        |
| Quinonas    |        |         |    ✓     |    ✓     |    ✓    |    ✓     |        |
| Esteroles   |        |    ✓    |          |          |         |          |   ✓    |
| Glicósidos  |   ✓    |    ✓    |    ✓     |          |         |    ✓     |   ✓    |

**b) Ficha por compuesto (rediseñada).** Estado cerrado escaneable:
- Etiqueta de familia (con punto de color) + **nombre** + **una frase** resumen.
- **Aplicaciones biomédicas como chips** con contorno (reemplazan la lista con viñetas).
- Un `<details>` "Ver función y estudios" que contiene, ya plegado: el texto
  completo de "¿Qué es?", la lista "función en la planta" y los estudios con enlaces.

### 2. Evidencia sobre actividad antimicrobiana

Reorganizada como **narrativa de 4 pasos** (el resultado deja de estar al final):

1. **La pregunta** — ¿los extractos de quintral inhiben el crecimiento bacteriano?
2. **Qué probamos** — extractos etanólicos (litre y quillay) vs 3 bacterias de
   referencia, 128–1024 µg/mL, control ampicilina.
3. **Resultado (veredicto, centro visual)** — "Sin inhibición del crecimiento" con
   las 3 bacterias listadas y ✕. **Tono neutro (pizarra/gris), NO rojo de alarma**:
   un resultado negativo es evidencia válida, no un fracaso.
4. **Qué significa** — la ausencia de efecto orienta futuras investigaciones.

- El párrafo introductorio largo (`NOTA_LITERATURA`) y el detalle técnico
  (concentraciones, controles, hospederos), junto con **Factores** y **Líneas
  futuras**, van dentro de un `<details>` "Ver detalles del ensayo".
- Cierre corto y positivo "¿Qué aprendimos?" (`APRENDIZAJE`), en tono verde.

## Cambios en datos

- **`src/lib/bibliotecaFito.ts`:** añadir a `FichaCompuesto` un campo canónico
  `propiedades: PropiedadCanonica[]` (unión de las 7 columnas) para alimentar la
  matriz sin adivinar por texto. Añadir también un campo `resumen: string` (la frase
  corta) y `familia: string` (etiqueta) por ficha. `aplicacionesBiomedicas`,
  `funcionEnPlanta`, `queEs` y `estudios` se conservan tal cual.
- **`src/lib/antimicrobiano.ts`:** sin cambios de datos; solo cambia cómo los
  consume el componente.

## CSS

Nuevas clases en `globals.css` reutilizando tokens existentes: `.fito-matriz`
(scroll + sticky), `.ficha` (rediseño), `.fito-chip`, `.ensayo-pasos`,
`.ensayo-veredicto`, `.ensayo-detalle`. Sin nuevas dependencias.

## Accesibilidad

- La matriz es una `<table>` con `<th scope="col">` y `<th scope="row">`; los ✓/·
  llevan texto accesible (`aria-label` "sí"/"no" o `<span class="sr-only">`) para no
  depender solo del glifo.
- El veredicto no comunica solo por color/ícono: el texto "Sin inhibición del
  crecimiento" es explícito.
- Los `<details>/<summary>` ya son accesibles por teclado.

## Tests (actualizar los existentes)

- **`BibliotecaFito.test.tsx`:** sigue verificando que aparecen los nombres de
  compuestos y sus aplicaciones; añadir aserción de que la matriz-panorama existe
  (p. ej. `getByRole("table")`).
- **`EvidenciaAntimicrobiana.test.tsx`:** la aserción actual
  `getAllByText(/sin inhibición/i).length === 3` **debe actualizarse** — en el nuevo
  diseño el veredicto dice "Sin inhibición" una vez y lista las 3 bacterias.
  Verificar en su lugar: las 3 bacterias presentes, el veredicto visible, el heading
  "¿Qué aprendimos?" y que el detalle técnico está dentro del `<details>`.

## Fuera de alcance

- Cambios de contenido científico (redacción de estudios, datos del ensayo).
- Otras secciones del sitio.
- Interactividad avanzada de la matriz (filtros, resaltado al clic): la matriz es
  estática en esta iteración.
