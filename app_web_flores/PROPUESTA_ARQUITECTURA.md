# Propuesta de arquitectura — App Web Flores

> Documento para revisión. **No se ha escrito código de la app todavía.**
> Objetivo: revivir la app de gestión de territorios (manzanas, caras, negocios,
> sincronización en tiempo real) sobre el motor de mapas moderno de **apksuba**
> (MapLibre GL + satélite híbrido + 3D).
> Fecha: 20 de noviembre de 2026.

---

## 0. Resumen en una frase

Construir una app web nueva en `app_web_flores/` que **reutiliza la lógica de
negocio del servidor antiguo** (`apksuba/app_base/backend/server.cjs`) y los
**datos reales** (`apksuba/app_base/data/`), pero **reemplaza el mapa de Leaflet
por el de MapLibre GL** de apksuba, para tener satélite y 3D sin perder la
gestión de manzanas, caras y negocios.

---

## 1. Qué se reutiliza, qué se reescribe

| Componente | Origen | Decisión |
|---|---|---|
| Datos de territorios (37) y manzanas (124) | `apksuba/app_base/data/mapas/territorio_1..37.json` | **Reutilizar tal cual** (copia). No se inventan ni reemplazan. |
| Estados de caras / negocios | `apksuba/app_base/data/partStates.json` | **Reutilizar** (migrar formato de clave, ver §4). |
| Registro de actividad | `apksuba/app_base/data/activityLog.json` | Reutilizar (función diferida, no en v1). |
| Lógica de servidor (estado manzana, negocios, sync) | `apksuba/app_base/backend/server.cjs` | **Reutilizar y mejorar** (ver §6). |
| Motor de mapa (satélite, 3D, estilos) | `apksuba/app_base/src/utils/mapStyleHelper.js` | **Copiar y adaptar** (quitar PMTiles offline). |
| Render de capas MapLibre | `apksuba/app_base/src/components/MapLibreMap.jsx` | **Patrón de referencia**, se reescribe para manzanas/caras. |
| Frontend Leaflet antiguo (`MapComponent.jsx`) | ya no existe en el repo | No se reutiliza; solo su lógica conceptual. |
| Mapa offline PMTiles | apksuba | **NO se incluye** (es web, siempre con internet). |

**Principio:** apksuba no se toca. `app_web_flores` es autocontenida; copia lo que
necesita. Cero dependencia cruzada entre las dos apps.

---

## 2. Arquitectura general

```
┌───────────────────────────── NAVEGADOR (varios dispositivos) ─────────────────────────────┐
│                                                                                            │
│   React + Vite + MapLibre GL JS                                                            │
│   ├─ Mapa: territorios (37) · manzanas (on-demand) · caras (aristas) · negocios            │
│   ├─ Capas base: Calles (OpenFreeMap) / Satélite híbrido (Esri) + 3D (pitch)               │
│   ├─ Estado en memoria (useReducer) + cache local (localStorage) para arranque rápido      │
│   └─ Cliente Socket.IO (sincroniza cambios en tiempo real)                                 │
│                                                                                            │
└──────────────────────────────────────── WebSocket (wss) ──────────────────────────────────┘
                                             │
┌──────────────────────────────── SERVIDOR (Oracle Cloud Always Free) ───────────────────────┐
│                                                                                             │
│   Node.js + Express + Socket.IO                                                             │
│   ├─ Sirve el frontend compilado (dist/)                                                    │
│   ├─ Valida y persiste cambios (fuente de verdad = base de datos)                           │
│   ├─ Difunde actualizaciones a los demás dispositivos                                       │
│   └─ Protección temporal por clave compartida (sin cuentas de usuario en v1)                │
│                                                                                             │
│   Base de datos: SQLite (archivo único, cero configuración, respaldos triviales)            │
│   └─ Tablas: territorios · manzanas · caras · estados · negocios                            │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Modelo de datos geográficos (verificado en el código real)

### 3.1 Lo que YA existe en los archivos

Cada `territorio_N.json` tiene:
```jsonc
{
  "territorio_id": "T1",          // identificador estable del territorio
  "numero_territorio": "1",       // número visible
  "limites": [[lat, lng], ...],   // polígono del territorio (contorno)
  "manzanas": [
    {
      "id": "m_1_b1782022723999", // identificador ESTABLE de manzana
      "numero": "1",              // número visible
      "puntos": [[lat, lng], ...] // vértices del polígono de la manzana
    }
  ]
}
```

- **37 territorios** reales (`T1`–`T37`), **124 manzanas** en total.
- Una **cara** es la arista entre el vértice `i` y el `i+1` del array `puntos`
  (la última cara cierra del último vértice al primero).
- El `partStates.json` actual usa claves como `T28_m_1_b1779750641113_p0`
  = territorio T28, manzana `m_1_b1779750641113`, cara índice 0.

### 3.2 Identificación estable de caras (requisito 6.3 y 6.7)

**El problema:** el índice de arista `p0, p1, …` depende del orden de `puntos`.
Si alguien edita la geometría de una manzana (reordena o inserta vértices), la
cara `p2` podría pasar a referirse a otra arista física, y un estado "hecha" se
asignaría silenciosamente a un borde distinto. El prompt prohíbe esto.

**Solución propuesta — identificador compuesto + huella geométrica:**

- **ID lógico de cara** (clave primaria para la base de datos):
  `{territorio_id}::{manzana_id}::f{indice}` → ej. `T28::m_1_b1779750641113::f0`.
  Es estable mientras la geometría de la manzana no cambie.
- **Huella geométrica (`geohash` del punto medio de la arista)**: se guarda junto
  al estado. Sirve de verificación: si la geometría de una manzana cambia, al
  recargar se compara la huella guardada contra la nueva arista. Si no coinciden,
  la cara afectada se marca como **"revisar"** (no se borra ni se reasigna sola),
  y se avisa. Así cumplimos "no cambiar silenciosamente el significado geográfico
  de una cara".

Esto es una **capa de seguridad**, no un cambio de datos: el 99% del tiempo la
geometría no cambia y todo funciona con el ID lógico.

### 3.3 Numeración visible vs. identidad persistente

- **Número mostrado** (`Cara 1`, `Cara 2`…) = `indice + 1`. Solo para la interfaz.
- **Identificador persistente** = el ID lógico de §3.2. Nunca se usa el número
  visible como única clave en la base de datos (requisito 6.7).

---

## 4. Base de datos: SQLite

### 4.1 Por qué SQLite (comparación)

| Opción | Ventaja | Desventaja | Veredicto |
|---|---|---|---|
| **JSON plano** (como hoy) | Cero setup | Sin integridad, sin consultas, concurrencia frágil | Sirvió para 1 usuario; insuficiente para multi-dispositivo |
| **SQLite** | Un archivo, cero servidor aparte, respaldo = copiar archivo, transacciones ACID | No escala a miles de usuarios | **Recomendado**: es exactamente la escala de este proyecto |
| **PostgreSQL** | Robusto, concurrente | Instalar y mantener un servidor extra en una VM diminuta | Sobredimensionado para Oracle Free |

**Recomendación: SQLite.** Encaja con la escala (una persona, pocos dispositivos),
simplifica el despliegue en Oracle Always Free (poca RAM) y los respaldos son
copiar un archivo.

### 4.2 Esquema propuesto

```sql
-- Territorios (datos geográficos; se cargan desde los JSON una sola vez)
CREATE TABLE territorios (
  id            TEXT PRIMARY KEY,      -- "T1".."T37"
  numero        TEXT NOT NULL,
  limites_json  TEXT NOT NULL          -- polígono del territorio (JSON)
);

-- Manzanas (pertenecen a un territorio)
CREATE TABLE manzanas (
  id            TEXT PRIMARY KEY,      -- "m_1_b1782022723999"
  territorio_id TEXT NOT NULL REFERENCES territorios(id),
  numero        TEXT NOT NULL,
  puntos_json   TEXT NOT NULL          -- vértices del polígono (JSON)
);

-- Caras (una fila por arista; se derivan de la geometría de la manzana)
CREATE TABLE caras (
  id            TEXT PRIMARY KEY,      -- "T28::m_1_...::f0"  (ID lógico §3.2)
  manzana_id    TEXT NOT NULL REFERENCES manzanas(id),
  indice        INTEGER NOT NULL,      -- 0..n-1  (número visible = indice+1)
  geohash       TEXT,                  -- huella del punto medio (verificación)
  estado        TEXT NOT NULL DEFAULT 'sin_hacer',  -- 'sin_hacer' | 'hecha'
  es_negocio    INTEGER NOT NULL DEFAULT 0,         -- 0 normal, 1 cara de negocio (tipo A)
  negocio_estado TEXT DEFAULT NULL,    -- 'sin_hacer' | 'hecha'  (solo si es_negocio=1)
  UNIQUE(manzana_id, indice)
);

-- Negocios independientes (tipo B: geometría propia, no es una arista de manzana)
CREATE TABLE negocios_independientes (
  id            TEXT PRIMARY KEY,
  territorio_id TEXT REFERENCES territorios(id),   -- puede ser NULL (sin territorio)
  nombre        TEXT,
  geometria_json TEXT NOT NULL,        -- punto o polígono propio
  estado        TEXT NOT NULL DEFAULT 'sin_hacer'  -- 'sin_hacer' | 'hecha'
);
```

**Relaciones:** territorio 1—N manzanas 1—N caras. Negocios tipo A viven en
`caras` (`es_negocio=1`). Negocios tipo B viven en `negocios_independientes`
(territorio opcional, cumpliendo "no asumir que todo negocio pertenece a un
territorio").

### 4.3 Migración desde `partStates.json` (preservar datos existentes)

El prompt exige: explicación, script, respaldo, rollback, verificación de integridad.

1. **Respaldo**: copiar `partStates.json`, `activityLog.json` y los 37 JSON a
   `app_web_flores/backups/` con fecha antes de migrar.
2. **Script de importación** (`scripts/importar-datos.cjs`):
   - Lee los 37 `territorio_N.json` → llena `territorios` y `manzanas`.
   - Deriva las caras de cada manzana → llena `caras` (calcula `geohash`).
   - Lee `partStates.json`:
     - `T{t}_m_{..}_p{i} = completed` → `caras.estado = 'hecha'`.
     - `type_{..} = business` → `caras.es_negocio = 1`.
     - `bag_pos_{..}` → se conserva como metadato (posición del icono maletín).
3. **Verificación**: contar que las 124 manzanas y sus caras entraron; comparar
   nº de caras "hecha" con el nº de claves `completed` del JSON original.
4. **Rollback**: borrar el archivo `.sqlite` y volver a los JSON respaldados.

**Ningún dato se borra.** Los JSON originales quedan intactos como respaldo.

---

## 5. Estados y colores (reglas exactas del prompt)

### 5.1 Cara normal (2 estados)
| Estado | Color |
|---|---|
| `sin_hacer` | Gris |
| `hecha` | Verde |

Nunca amarillo en una cara. Cada cara es independiente.

### 5.2 Manzana (derivado de sus caras normales)
| Color | Regla |
|---|---|
| Gris | ninguna cara normal hecha |
| Amarillo | algunas hechas, pero no todas |
| Verde | todas las caras normales hechas |

Si la manzana no tiene caras normales válidas → **no** se marca verde (se maneja
explícitamente como gris / sin estado). Las caras de negocio **no** cuentan para
el estado normal de la manzana.

### 5.3 Territorio (derivado de sus manzanas normales)
| Color | Regla |
|---|---|
| Gris | ninguna cara hecha en ninguna manzana |
| Amarillo | hay avance, pero no todas las manzanas están verdes |
| Verde | todas las manzanas verdes |

El progreso de negocios **no** altera el estado normal del territorio.

### 5.4 Maletín de negocios (agregado, independiente)
| Color | Regla |
|---|---|
| Gris | ningún negocio hecho |
| Amarillo | algunos negocios hechos, otros no |
| Verde | todos los negocios hechos |

El maletín aparece **solo** si el objeto tiene caras/geometrías de negocio. Se
calcula aparte del estado normal.

Esta lógica ya existe y es correcta en `server.cjs` (`getBlockState`); se porta
al nuevo modelo con mínimos ajustes de nombres.

---

## 6. Eventos Socket.IO

Reutilizamos los del servidor antiguo, adaptados al modelo nuevo y con
confirmación de persistencia antes de difundir (requisito 13.2).

| Evento (cliente → servidor) | Carga útil | Acción servidor |
|---|---|---|
| `cara:actualizar` | `{ caraId, estado }` | valida → guarda en SQLite → confirma → difunde `cara:actualizada` |
| `manzana:completar` | `{ manzanaId }` | marca todas las caras normales `hecha` en una transacción → difunde |
| `cara:tipo_negocio` | `{ caraId, esNegocio }` | define cara de negocio (tipo A) → difunde |
| `negocio:actualizar` | `{ negocioId, estado }` | estado de negocio (A o B) → difunde |
| `negocio_indep:crear` | `{ geometria, territorioId? }` | crea negocio tipo B → difunde |
| `limpiar:progreso` | `{ clave }` | (protegido) borra estados normales, conserva negocios → difunde |

| Evento (servidor → cliente) | Cuándo |
|---|---|
| `estado:inicial` | al conectar: territorios + manzanas + estados |
| `cara:actualizada`, `manzana:actualizada`, `negocio:actualizado` | tras persistir un cambio |

**Consistencia (13.2):** el servidor es la fuente de verdad. Flujo: validar →
guardar → confirmar → difundir. Nunca se difunde un cambio no confirmado.

**Conflictos:** última escritura gana (`last-write-wins`) por cara individual.
Es seguro porque las caras son independientes y el uso real es de una sola
persona en varios dispositivos. Lo documento como limitación conocida.

**Reconexión:** al reconectar, el cliente pide `estado:inicial` de nuevo y
reemplaza su estado local → se recupera de cortes de red.

---

## 7. Estrategia de carga y rendimiento (requisito 11)

El punto crítico del prompt: **no cargar las 124 manzanas de golpe al abrir.**

### 7.1 Vista inicial (ligera)
- Al abrir: cargar **solo los 37 polígonos de territorio** + su color de estado
  general (gris/amarillo/verde). **No** se cargan manzanas ni caras.
- El estado general por territorio se precalcula en el servidor y se envía
  compacto (un color por territorio), para no transferir geometría de manzanas.

### 7.2 "Mostrar solo este" (flujo principal, 1 toque)
- Al seleccionar un territorio y pulsar **"Mostrar solo este"**:
  centra y ajusta zoom, y **carga bajo demanda** las manzanas y caras de **ese**
  territorio únicamente. No se cargan las de otros territorios.

### 7.3 "Mostrar todos"
- Carga todas las manzanas. Usa fuentes GeoJSON de MapLibre (dibujo por GPU,
  equivalente al `preferCanvas` de Leaflet). Las etiquetas de cara solo aparecen
  a partir de cierto zoom (no todas, a todo nivel — requisito 11).

### 7.4 Técnicas que SÍ aplicaremos (y por qué)
- **Carga on-demand por territorio** (evita transferir 124 manzanas).
- **Fuentes GeoJSON + capas filtradas** por `selectedIds` (filtro instantáneo sin
  recrear capas; patrón ya probado en `MapLibreMap.jsx` de apksuba).
- **Etiquetas de cara por zoom** y resaltado temporal (menos saturación visual).
- **Liberar fuentes/capas** de territorios no visibles.

### 7.5 Técnicas que NO aplicaremos de entrada (y por qué)
- Simplificación de geometría: las manzanas ya son pequeñas; no hace falta.
- Teselado vectorial propio: sobredimensionado para 124 manzanas.
> El prompt pide no aplicar todas las técnicas sin evaluar. Mediremos antes/después.

---

## 8. Solución al problema "no sé qué cara es cuál" (requisito 6.6)

Este es el problema que describiste: manzanas irregulares con muchas caras donde
no se distinguía qué arista del mapa era cada "Cara N" del menú.

**Enfoque propuesto (lista ↔ mapa sincronizados):**

1. Al seleccionar una manzana, se abre el menú con el botón grande
   **"Completar manzana"** y la **lista de caras** (Cara 1, Cara 2, …) con su
   color de estado.
2. Al **tocar una cara en la lista** → el mapa **resalta esa arista** (línea
   gruesa animada) y muestra su número encima del borde. La arista queda
   resaltada mientras está seleccionada.
3. Al **tocar una arista en el mapa** → se resalta el elemento correspondiente en
   la lista. Relación biunívoca y clara.
4. En móvil **no** se obliga a tocar una arista diminuta: la vía principal es la
   lista; el toque en el mapa es un extra.
5. Número visible = `indice + 1`, siempre igual en lista y mapa (requisito 6.7).

"Completar manzana" marca todas las caras normales como hechas, con opción de
**deshacer** y de seguir cambiando caras individuales después (requisito 6.5).

---

## 9. Mapas y 3D (lo que traemos de apksuba)

- **Calles**: OpenFreeMap Liberty (vector, sin API key).
- **Satélite híbrido**: Esri World Imagery + etiquetas de Liberty
  (`getSatelliteHybridStyle` de apksuba, copiado tal cual).
- **3D**: `pitch` de MapLibre (inclinación), como en apksuba.
- **Sin PMTiles offline**: es una web; siempre hay internet. Se elimina esa parte
  del helper al copiarlo.

Las capas de territorios/manzanas/caras/negocios se insertan como fuentes GeoJSON
separadas para que no interfieran entre sí (requisito 10).

---

## 10. Despliegue en Oracle Cloud Always Free (resumen; detalle en Fase 7)

- VM Always Free (Ampere ARM o x86 micro), Ubuntu LTS.
- Node.js + el servidor Express/Socket.IO sirviendo `dist/` y la base SQLite.
- HTTPS + WebSocket seguro (wss) con Caddy (certificado automático) — reutiliza el
  patrón de `para_servidor/` del repo.
- Firewall: abrir solo 80/443. Socket.IO viaja sobre 443.
- **Protección temporal (13.4):** clave compartida de acceso (una contraseña en
  una variable de entorno). Sin cuentas de usuario. Limitación: quien tenga la
  clave puede editar. Se documenta como provisional.
- Respaldo: copia periódica del archivo `.sqlite`.
- Sin generar actividad artificial para evadir políticas de inactividad.

> El despliegue se hace **después** de probar la versión local (regla 17 del prompt).

---

## 11. Estructura de carpetas propuesta para `app_web_flores/`

```
app_web_flores/
├─ cliente/                  # Frontend React + Vite + MapLibre
│  ├─ src/
│  │  ├─ App.jsx
│  │  ├─ estado/             # useReducer: territorios, selección, estados
│  │  ├─ componentes/
│  │  │  ├─ Mapa.jsx             # MapLibre: territorios, manzanas, caras, negocios
│  │  │  ├─ MenuManzana.jsx      # botón "Completar manzana" + lista de caras
│  │  │  ├─ PanelTerritorios.jsx # selección, "mostrar solo este/todos"
│  │  │  └─ CapaNegocios.jsx     # maletines flotantes, vista aislada
│  │  ├─ mapa/               # helpers copiados de apksuba (estilos, satélite, 3D)
│  │  ├─ socket/             # cliente Socket.IO
│  │  └─ utils/geoCaras.js   # derivar caras de polígonos, geohash, estados
│  └─ vite.config.js
├─ servidor/                 # Backend Node + Express + Socket.IO + SQLite
│  ├─ server.cjs
│  ├─ db.cjs                 # acceso SQLite
│  └─ logica/estados.cjs     # getBlockState portado + estados de territorio/negocio
├─ datos/                    # copia de los 37 JSON (fuente para importar)
├─ scripts/importar-datos.cjs
├─ backups/                  # respaldos de datos antes de migrar
└─ README.md
```

---

## 12. Fases de implementación (orden propuesto)

Siguiendo el flujo del prompt (§16), por etapas controladas:

1. **Fase A — Esqueleto + datos**: estructura de carpetas, copiar los 37 JSON,
   crear SQLite, script de importación con respaldo y verificación.
2. **Fase B — Mapa base**: MapLibre con calles/satélite/3D (de apksuba) + los 37
   territorios con su color de estado. Vista inicial ligera.
3. **Fase C — Selección**: "Mostrar solo este", "Mostrar todos", selección
   múltiple, carga de manzanas on-demand.
4. **Fase D — Caras y menú**: menú de manzana, lista de caras, "Completar
   manzana", sincronización lista↔mapa (§8), estados manzana/territorio.
5. **Fase E — Negocios**: caras de negocio (A), negocios independientes (B),
   maletines flotantes, vista aislada.
6. **Fase F — Socket.IO**: tiempo real, persistencia confirmada, reconexión,
   clave de acceso temporal, pruebas multi-dispositivo (local).
7. **Fase G — Despliegue Oracle**: tras validar en local.
8. **Fase H — Empaquetado Android (APK de app web flores)**: generar una app
   Android independiente de apksuba (distinto appId y nombre), que use la
   información y funcionalidad de app web flores. Se hace al final, tras validar
   la web. Ver RF-29 / RNF-23.

Cada fase se prueba antes de pasar a la siguiente.

> **Decisiones consolidadas (ver ADR-002):** se adopta el Modelo 1 (cara con
> doble faceta normal + negocio) con la regla "un modo a la vez". Se descarta el
> negocio tipo B (geometría independiente): todo negocio se asigna a una cara.

---

## 13. Decisiones que necesito que apruebes

1. **Base de datos: ¿SQLite?** (recomendado) o ¿prefieres mantener JSON plano?
2. **Identificación de caras: ¿ID lógico + huella geohash?** (recomendado para no
   reasignar estados por error si cambia la geometría).
3. **Estructura `cliente/` + `servidor/`** dentro de `app_web_flores` — ¿ok?
4. **Protección temporal por clave compartida** (sin cuentas) para v1 — ¿ok?
5. **Conflictos: última escritura gana por cara** — ¿aceptable para tu uso?
6. **Orden de fases A→G** — ¿empezamos por la Fase A (esqueleto + datos)?

Cuando confirmes (o ajustes) estos seis puntos, empiezo a construir, fase por fase.
```