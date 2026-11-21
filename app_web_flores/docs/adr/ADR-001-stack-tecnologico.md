# ADR-001: Stack tecnológico de App Web Flores

- **Estado:** Aceptado
- **Fecha:** 2026-11-20
- **Ámbito:** `app_web_flores/` (no afecta a apksuba)

## Contexto

Vamos a revivir la aplicación web de gestión de territorios ("App Web Flores"),
separada de la app Android ("apksuba"). La app web debe:

- Gestionar 37 territorios y 124 manzanas reales (datos ya existentes).
- Registrar el progreso de caras, manzanas y territorios.
- Gestionar caras de negocio y su progreso por separado.
- Sincronizar cambios entre varios dispositivos en tiempo real.
- Mostrar mapa satélite y 3D (reutilizando el motor de apksuba, MapLibre GL).
- Desplegarse en Oracle Cloud Always Free (recursos limitados).

**Escala de uso real estimada:** ~10 personas en total; menos de 20 en
simultáneo; tope generoso de 100. Escrituras pequeñas y poco frecuentes
(marcar una cara, completar una manzana).

## Decisión

Se adopta el siguiente stack:

| Capa | Tecnología | Versión objetivo |
|---|---|---|
| Frontend | React + Vite | React 18, Vite 5 |
| Mapa | MapLibre GL JS | 4.x (igual que apksuba) |
| Backend | Node.js + Express | Node 20 LTS |
| Tiempo real | Socket.IO | 4.x |
| Base de datos | **SQLite** | 3.x (vía `better-sqlite3`) |
| Despliegue | Oracle Cloud Always Free + Caddy (HTTPS/wss) | — |

### Sobre la base de datos: SQLite (foco de este ADR)

Se elige **SQLite** por encima de JSON plano y de PostgreSQL.

**Comparación:**

| Opción | A favor | En contra | Veredicto |
|---|---|---|---|
| JSON plano (como la app antigua) | Cero configuración | Sin integridad referencial, sin transacciones, concurrencia frágil, riesgo de corrupción al escribir desde varios eventos | Insuficiente para multi-dispositivo |
| **SQLite** | Un solo archivo, cero servidor aparte, transacciones ACID, respaldo = copiar archivo, bajo consumo de RAM (ideal para Oracle Free) | No escala a miles de escrituras concurrentes por segundo | **Elegido**: encaja exacto con la escala (10 personas) |
| PostgreSQL | Robusto, alta concurrencia | Servidor extra que mantener y monitorear en una VM pequeña; sobredimensionado | Innecesario a esta escala |

**Justificación frente a la escala real:**

- Con ~10 usuarios y <20 simultáneos, la concurrencia de escritura es mínima.
- `better-sqlite3` es síncrono y muy rápido para esta carga; las escrituras
  (marcar cara, completar manzana) son operaciones de milisegundos.
- La concurrencia de escritura en SQLite se serializa a nivel de archivo. A esta
  escala no genera contención perceptible. Se habilita el modo **WAL**
  (Write-Ahead Logging) para permitir lecturas concurrentes mientras se escribe.
- El servidor Socket.IO es el **único** proceso que escribe en la base de datos
  (los clientes nunca tocan el archivo directamente), lo que elimina los
  problemas clásicos de múltiples escritores sobre SQLite.

## Consecuencias

**Positivas:**

- Despliegue y respaldo triviales (un archivo `.sqlite`).
- Bajo consumo de recursos, adecuado para Oracle Always Free.
- Integridad de datos garantizada por transacciones (p.ej. "Completar manzana"
  marca todas las caras en una sola transacción atómica).

**Negativas / limitaciones:**

- No apto si en el futuro el uso creciera a cientos de escrituras concurrentes
  por segundo. Mitigación: migrar a PostgreSQL sería directo si llegara el caso.
- SQLite vive en el disco de la VM; el respaldo depende de copiar el archivo
  periódicamente (se define en la fase de despliegue).

## Decisiones pendientes (futuros ADR)

- ADR-002: modelo de datos detallado (esquema de tablas, caras de negocio).
- ADR-003: estrategia de sincronización y resolución de conflictos en Socket.IO.
- ADR-004: mecanismo de protección temporal de acceso (clave compartida).
- ADR-005: despliegue en Oracle Cloud Always Free.
