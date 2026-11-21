# Lista de pendientes — App Web Flores

> Tablero de control para no perder el hilo durante la planificación e implementación.
> Última actualización: 2026-11-20.
> Estados: ⬜ pendiente · 🔄 en curso · ✅ hecho · ⏸️ diferido

---

## A. Planificación (en curso)

| # | Tema | Estado | Notas |
|---|---|---|---|
| A1 | Stack tecnológico (ADR-001) | ✅ | SQLite aprobado |
| A2 | Modelo de datos y caras de negocio (ADR-002) | ✅ | Modelo 1, tipo B descartado |
| A3 | Regla "un modo a la vez" | ✅ | Documentada |
| A4 | Maletín en vista de territorios | ✅ | Opción A: `labelPoint` automático |
| A5 | Regla de negocio: identificar caras de negocio en modo predicación (días especiales) | ✅ | RN-01; matiz ver/marcar documentado |
| A6 | ADR-003: Sincronización y resolución de conflictos (Socket.IO) | ✅ | Optimista + LWW + silencioso + cola offline + indicador conexión |
| A7 | ADR-004: Protección de acceso (lectura / editor-PIN / admin) | ✅ | 3 niveles, PIN por sesión, varios admin, bcrypt |
| A8 | ADR-005: Despliegue Oracle Cloud Always Free | ⏸️ | Plan documentado. **Decisión pendiente: Always Free vs PAYG** (se decide al final, antes de Fase G) |
| A9 | Diseño detallado del menú de manzana (lista de caras + maletín por cara) | ✅ | Números con manzana seleccionada, solo lista, bottom sheet, orden polígono |
| A10 | Sección "territorios de negocio" del informe | ⏸️ | Tema abierto TA-01 (diferido) |

---

## B. Implementación (no iniciada; tras aprobar planificación)

| # | Fase | Estado | Entregable |
|---|---|---|---|
| B1 | Fase A — Esqueleto + datos + migración | ✅ | 37 territorios / 124 manzanas / 620 caras importados y verificados. Estados en blanco (datos de prueba). Traslado de estados antiguos escrito pero desactivado. |
| B2 | Fase B — Mapa base (calles/satélite/3D) + 37 territorios | ⬜ | Vista inicial ligera |
| B3 | Fase C — Selección (solo este / todos / múltiple) + carga on-demand | ⬜ | |
| B4 | Fase D — Caras y menú (completar manzana, lista↔mapa, estados) | ⬜ | |
| B5 | Fase E — Negocios (caras de negocio, maletines, vista aislada) | ⬜ | |
| B6 | Fase F — Socket.IO (tiempo real, persistencia, reconexión, clave) | ⬜ | |
| B7 | Fase G — Despliegue Oracle Cloud | ⬜ | |
| B8 | Fase H — Empaquetado APK de app web flores (independiente) | ⬜ | RF-29 / RNF-23 |

---

## C. Tareas operativas pendientes

| # | Tarea | Estado | Notas |
|---|---|---|---|
| C1 | Borrar el cascarón vacío bloqueado en `C:\Users\usuario\Desktop\app_territorios` | ⬜ | Lo hace el usuario (cerrar Explorador/terminal viejo) |
| C2 | Rama de trabajo para app web flores | ✅ | Rama `app-web-flores` creada y activa; se trabaja aquí sin tocar `main`. Identidad local: davidrraimol1012@gmail.com |
| C3 | Organizar/limpiar el repo (está desordenado: APKs sueltos, docs legadas, para_servidor, etc.) | ⬜ | Hacerlo en un punto conveniente del desarrollo (no urgente) |

---

## Regla de oro de este tablero

No empezar una tarea nueva sin cerrar o pausar explícitamente la anterior. Si surge
una idea, se anota aquí y se retoma el hilo actual.
