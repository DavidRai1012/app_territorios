# Temas abiertos (pendientes de discusión)

> Decisiones que quedaron explícitamente para más adelante.
> Última actualización: 2026-11-20.

## TA-01: Sección de "territorios de negocio" en el informe

**Contexto:** los negocios se gestionan aparte del progreso normal. El usuario
decidió que el informe tendrá una **sección especial de territorios de negocio**,
cuyo diseño se discutirá más adelante.

En esa discusión futura deben quedar resueltas las 5 preguntas de diseño de
negocios planteadas en la planificación:

1. ¿Modelo de cara de negocio? → **Resuelto**: Modelo 1 (doble faceta). Ver ADR-002.
2. ¿Negocio tipo B representado como punto o polígono? → **Resuelto**: tipo B
   descartado; todo negocio es una cara (tipo A).
3. ¿Posición del maletín? → **Resuelto en manzana** (sobre la cara de negocio).
   En vista de territorio: `labelPoint` automático (ADR-002 §7).
4. ¿Agregación del maletín de territorio? → **Resuelto**: agrega todas las caras
   de negocio de las manzanas del territorio (ADR-002 §6).
5. ¿Negocio sin territorio? → **Resuelto**: al descartar el tipo B, todo negocio
   pertenece a una manzana y por tanto a un territorio. El detalle de cómo se
   presentan en el **informe** queda para esta sección especial (pendiente).

**Pendiente:** definir el contenido, formato y agrupación de la sección de
territorios de negocio en el informe (relacionado con RF-D4, función diferida de
reportes).

## TA-02: Representación visual del maletín cuando una manzana tiene varias caras de negocio

¿Se muestra un maletín por cada cara de negocio, o un solo maletín agregado por
manzana? Se decidirá en implementación (Fase E) según claridad visual.
