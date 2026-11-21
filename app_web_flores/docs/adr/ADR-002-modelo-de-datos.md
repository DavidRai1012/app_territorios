# ADR-002: Modelo de datos y caras de negocio

- **Estado:** Aceptado
- **Fecha:** 2026-11-20
- **Ámbito:** `app_web_flores/`
- **Depende de:** [ADR-001](ADR-001-stack-tecnologico.md) (SQLite)

## Contexto

El sistema gestiona 37 territorios y 124 manzanas reales. Cada manzana es un
polígono; cada arista del polígono es una **cara**. Hay que registrar el progreso
de predicación (caras normales) y el progreso de negocios, de forma independiente.

Durante la planificación se discutió cómo representar las caras de negocio. El
prompt original planteaba dos tipos (A: negocio sobre una cara existente;
B: negocio con geometría independiente). Tras discutirlo con el usuario:

- Se **descarta el tipo B** (negocios con geometría independiente). Si existe un
  negocio suelto, el administrador de territorios lo asigna a una cara de
  comercios existente. Esto simplifica el modelo (no hay tabla de geometrías
  independientes).
- Se adopta el **Modelo 1**: una cara puede tener **doble faceta** (ser normal y
  de negocio a la vez), con **dos estados independientes**.

## Decisión

### 1. Jerarquía de datos

```
territorio (1) ──< manzana (N) ──< cara (N)
```

### 2. La cara tiene doble faceta (Modelo 1)

Una cara (arista de manzana) puede ser:
- **Normal** siempre (cuenta para el progreso de predicación de la manzana).
- **De negocio** opcionalmente (si `es_negocio = 1`), con su propio estado que
  cuenta para el progreso de negocios.

Los dos estados son independientes: marcar una cara como "predicada" no cambia su
estado de negocio, y viceversa.

### 3. Semántica del estado de negocio de una cara

El estado de negocio de una cara responde a la pregunta:

> **"¿Se hicieron todos los negocios de esa cara?"**

- **Verde (`hecha`)**: sí, se hicieron todos los negocios de esa cara.
- **Gris (`sin_hacer`)**: no.

Es **binario por cara**. No importa cuántos negocios haya físicamente en la cara;
una sola cara = un solo estado de negocio. Nunca amarillo en la cara individual
(el amarillo solo existe en los agregados: manzana y territorio).

### 4. Esquema SQLite

```sql
CREATE TABLE territorios (
  id            TEXT PRIMARY KEY,      -- "T1".."T37"
  numero        TEXT NOT NULL,
  limites_json  TEXT NOT NULL          -- polígono del territorio (JSON [[lat,lng],...])
);

CREATE TABLE manzanas (
  id            TEXT PRIMARY KEY,      -- "m_1_b1782022723999"
  territorio_id TEXT NOT NULL REFERENCES territorios(id),
  numero        TEXT NOT NULL,
  puntos_json   TEXT NOT NULL          -- vértices del polígono (JSON)
);

CREATE TABLE caras (
  id              TEXT PRIMARY KEY,    -- ID lógico: "T28::m_1_b...::f0"
  manzana_id      TEXT NOT NULL REFERENCES manzanas(id),
  indice          INTEGER NOT NULL,    -- 0..n-1 (número visible = indice+1)
  geohash         TEXT,                -- huella del punto medio de la arista (verificación)
  estado_normal   TEXT NOT NULL DEFAULT 'sin_hacer',   -- 'sin_hacer' | 'hecha'
  es_negocio      INTEGER NOT NULL DEFAULT 0,          -- 0 | 1
  estado_negocio  TEXT DEFAULT NULL,   -- 'sin_hacer' | 'hecha' (solo si es_negocio=1)
  UNIQUE(manzana_id, indice)
);
```

**No existe** tabla `negocios_independientes` (tipo B descartado).

### 5. Identificación estable de caras

- **ID lógico** (clave primaria): `{territorio_id}::{manzana_id}::f{indice}`.
  Estable mientras la geometría de la manzana no cambie.
- **geohash del punto medio de la arista**: huella de verificación. Si la
  geometría cambia, al recargar se compara; si no coincide, la cara se marca para
  revisión (no se reasigna el estado en silencio). Cumple RNF-15.
- El número visible (`indice + 1`) es solo para la interfaz, nunca clave única.

### 6. Cálculo de estados (reglas)

**Manzana (predicación)** — a partir de `estado_normal` de sus caras:
- Gris: ninguna cara normal hecha.
- Amarillo: algunas hechas, no todas.
- Verde: todas hechas.
- Sin caras normales válidas → no se marca verde (gris explícito).

**Territorio (predicación)** — a partir de sus manzanas:
- Gris: sin avance. Amarillo: hay avance, faltan manzanas. Verde: todas verdes.

**Maletín de manzana (negocios)** — a partir de `estado_negocio` de sus caras
con `es_negocio=1`:
- Gris: ninguna hecha. Amarillo: algunas. Verde: todas.
- Solo aparece si la manzana tiene al menos una cara de negocio.

**Maletín de territorio (negocios)** — agrega **todas** las caras de negocio de
todas las manzanas del territorio:
- Gris / amarillo / verde con la misma regla.
- Solo aparece si el territorio tiene al menos una cara de negocio.

El progreso de negocios no altera el progreso normal, ni al revés (independencia
total).

### 7. Posición de los indicadores de maletín

- **En manzana**: el maletín se dibuja **sobre la cara de negocio** de la manzana
  (no se calcula una posición; se ancla a la arista de negocio). Si hay varias
  caras de negocio en la manzana, se muestra sobre cada una, o un agregado en la
  manzana (a decidir en implementación según claridad visual).
- **En la vista de territorios** (sin manzanas cargadas): el maletín se coloca en
  el **punto interior más amplio del territorio**, reutilizando el algoritmo
  `labelPoint` que ya existe en apksuba (`geoUtils.js`), desplazado para no tapar
  el nombre del territorio. Decisión tomada para evitar cálculo manual de posición
  (en la app antigua el usuario elegía la posición con `bag_pos_*`; se automatiza).

## Consecuencias

- Modelo fiel a la realidad: una calle con casas y negocios registra ambas cosas.
- La interfaz evita confusión mediante la regla **"un modo a la vez"** (ver
  `docs/decisiones/regla-un-modo-a-la-vez.md`): predicación y negocios nunca se
  marcan en la misma pantalla.
- Migración desde `partStates.json`: `completed` → `estado_normal='hecha'`;
  `type_*=business` → `es_negocio=1`. Los `bag_pos_*` dejan de usarse (posición
  automática).
- El informe de negocios tendrá una sección especial de "territorios de negocio"
  (tema abierto, ver `docs/decisiones/temas-abiertos.md`).
