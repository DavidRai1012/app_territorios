# ADR-003: Sincronización en tiempo real y resolución de conflictos

- **Estado:** Aceptado
- **Fecha:** 2026-11-20
- **Ámbito:** `app_web_flores/`
- **Depende de:** [ADR-001](ADR-001-stack-tecnologico.md) (Socket.IO, SQLite),
  [ADR-002](ADR-002-modelo-de-datos.md) (modelo de caras)

## Contexto

Varios dispositivos (≈10 personas, <20 simultáneas) marcan el progreso de caras,
manzanas y negocios, y deben verse sincronizados en tiempo real vía Socket.IO. El
servidor es la fuente de verdad (la base de datos SQLite), nunca el canal de
Socket.IO. Hay que decidir cómo se propagan los cambios, qué pasa ante cambios
simultáneos, y cómo se comporta la app ante cortes de red.

## Decisiones

### 1. Pintado optimista con reversión

Cuando el usuario toca una cara, su pantalla cambia **de inmediato** (no espera la
confirmación del servidor), para que la interacción se sienta instantánea.

Flujo:

```
Usuario toca "Cara 3"
  ├─ la app pinta el nuevo estado al instante (optimista)
  ├─ envía "cara:actualizar { caraId, estado }" al servidor
  ▼
Servidor: valida → guarda en SQLite → confirma → difunde a todos
  ▼
Si el servidor confirma: el estado ya coincide, no hay cambio visible.
Si el servidor rechaza o falla: la app revierte la cara a su valor anterior.
```

### 2. Última escritura gana (LWW) por cara

Ante dos cambios sobre la **misma** cara casi simultáneos, el **último mensaje que
llega al servidor** determina el valor final. No hay bloqueos ni fusión.

Justificación:
- Las caras son independientes y binarias (`hecha` / `sin_hacer`); no existe una
  "fusión" sensata: el valor final es simplemente el último que alguien quiso.
- A esta escala, dos personas tocando la **misma** cara en la misma fracción de
  segundo es muy improbable.
- Como el servidor difunde el resultado a **todos** los dispositivos (incluido el
  que ganó), todas las pantallas convergen al mismo valor. No quedan estados
  falsos: la verdad es única y compartida.

Cambios sobre caras **distintas** no son conflicto: ambos se guardan y difunden.

### 3. Resolución silenciosa (SIN aviso de cambio pisado) — DECISIÓN SENSIBLE

Cuando un cambio de un usuario es "pisado" por el de otro (LWW), **no se muestra
ningún aviso**. La pantalla simplemente se actualiza al valor final. La
sincronización es silenciosa.

> ⚠️ **ESTA DECISIÓN DEBE REVISARSE SI EL PROYECTO CRECE.**
>
> **Por qué es aceptable HOY:**
> - El uso real es de ~10 personas que se coordinan en la práctica; el solapamiento
>   sobre la misma cara es excepcional.
> - El estado final siempre es consistente entre todos los dispositivos.
> - Evita ruido de notificaciones en una app que debe ser simple.
>
> **Riesgo que se asume:** un usuario puede marcar una cara y, segundos después,
> verla cambiada por otro sin saber por qué. A pequeña escala es tolerable y hasta
> esperado (coordinación informal).
>
> **Cuándo reconsiderar (señales de que hay que añadir avisos):**
> - El número de usuarios simultáneos sube de forma relevante (ej. >20 reales).
> - Aparecen quejas de "marqué algo y se deshizo solo".
> - Se añaden datos no binarios o con más de dos estados, donde "pisar" un cambio
>   pierde información más valiosa que un simple hecha/sin_hacer.
>
> **Camino de evolución si se reconsidera:**
> 1. Añadir aviso suave ("Otro dispositivo actualizó esta cara").
> 2. Registrar quién y cuándo hizo cada cambio (metadatos de autoría + timestamp).
> 3. Si llegara a requerirse edición concurrente fina, evaluar versionado por
>    registro o un enfoque CRDT (hoy sería sobre-ingeniería).
>
> La arquitectura no impide estos cambios: añadir `actualizado_por` y
> `actualizado_en` a la tabla `caras` y emitir el autor en la difusión es
> incremental y no rompe nada.

### 4. Cambios offline: cola de reenvío + indicador de conexión

**Cola de reenvío (opción b):**
- Si el dispositivo pierde conexión, los cambios que el usuario marca se guardan
  en una **cola local** (en memoria / localStorage).
- Al reconectar, la app:
  1. Reenvía los cambios encolados al servidor (que aplica LWW a cada uno).
  2. Pide el estado completo (`estado:inicial`) y reemplaza su estado local, para
     ponerse al día con lo que pasó mientras estuvo desconectado.
- Así no se pierde lo marcado sin red, y el dispositivo converge al estado real.

**Indicador de conexión (confirmado posible):**
- Socket.IO expone eventos `disconnect` y `connect`. La app muestra un indicador
  visible cuando está **sin conexión** (ej. una barra/etiqueta "Sin conexión —
  los cambios se guardarán al reconectar"), y lo oculta al reconectar.
- Esto da contexto al usuario: sabe que puede seguir marcando y que se sincronizará
  luego.

## 5. Qué se sincroniza y qué no

| Se sincroniza (se difunde a todos) | NO se sincroniza (local a cada dispositivo) |
|---|---|
| Estado de caras (normal y negocio) | Selección de territorios ("mostrar solo este", etc.) |
| Completar manzana | Modo activo (Predicación / Negocios) |
| Definir cara como de negocio | Capa base (calles/satélite), inclinación 3D, zoom |

La selección y la vista son decisiones locales de cada persona; difundirlas
molestaría (cada quien mira lo suyo). Solo el **progreso** es compartido.

## 6. Eventos Socket.IO (resumen; detalle de cargas en PROPUESTA_ARQUITECTURA.md §6)

| Dirección | Evento | Propósito |
|---|---|---|
| cliente → servidor | `cara:actualizar` | cambiar estado normal o de negocio de una cara |
| cliente → servidor | `manzana:completar` | marcar todas las caras normales de una manzana |
| cliente → servidor | `cara:tipo_negocio` | definir/quitar faceta de negocio de una cara |
| servidor → cliente | `estado:inicial` | estado completo al conectar o reconectar |
| servidor → cliente | `cara:actualizada`, `manzana:actualizada` | difusión tras persistir |

Flujo de consistencia (siempre): **validar → guardar en SQLite → confirmar →
difundir**. Nunca se difunde un cambio no persistido.

## Consecuencias

- Interacción instantánea (optimista) con convergencia garantizada (difusión a
  todos + LWW).
- No se pierde trabajo hecho sin red (cola de reenvío).
- El usuario sabe cuándo está sin conexión (indicador).
- Se asume conscientemente el riesgo de "pisado silencioso", documentado y con
  camino de evolución claro si el proyecto crece.
