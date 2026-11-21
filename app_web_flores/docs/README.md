# Documentación — App Web Flores

Documentación de la aplicación web de gestión de territorios (separada de apksuba).

## Índice

### Decisiones de arquitectura (ADR)
- [ADR-001: Stack tecnológico](adr/ADR-001-stack-tecnologico.md) — **Aceptado** (SQLite confirmado)
- [ADR-002: Modelo de datos y caras de negocio](adr/ADR-002-modelo-de-datos.md) — **Aceptado** (Modelo 1)
- [ADR-003: Sincronización y conflictos](adr/ADR-003-sincronizacion-y-conflictos.md) — **Aceptado** (optimista + LWW)
- [ADR-004: Protección de acceso](adr/ADR-004-proteccion-de-acceso.md) — **Aceptado** (lectura / PIN / admin)
- [ADR-005: Despliegue Oracle Cloud](adr/ADR-005-despliegue-oracle-cloud.md) — **Plan documentado**; decisión Always Free vs PAYG pendiente (se decide al final)

### Decisiones de diseño
- [Regla "un modo a la vez"](decisiones/regla-un-modo-a-la-vez.md) — **Aceptada**
- [Menú de manzana e identificación de caras](decisiones/menu-de-manzana.md) — **Aceptada**
- [Reglas de negocio (RN)](decisiones/reglas-de-negocio.md) — dominio
- [Convenciones de interfaz (UI)](decisiones/convenciones-ui.md) — SVG, no emojis
- [Temas abiertos](decisiones/temas-abiertos.md) — pendientes de discusión

### Requisitos
- [Requisitos funcionales (RF)](requisitos/requisitos-funcionales.md) — documento vivo
- [Requisitos no funcionales (RNF)](requisitos/requisitos-no-funcionales.md) — documento vivo

### Propuesta general
- [PROPUESTA_ARQUITECTURA.md](../PROPUESTA_ARQUITECTURA.md) — visión global (en revisión)

## Convenciones

- Cada decisión técnica relevante se registra como un ADR numerado.
- Los requisitos se identifican con `RF-NN` (funcionales) y `RNF-NN` (no funcionales).
- Las funciones diferidas se marcan `RF-DN`.
