# Regla de diseño: "un modo a la vez"

- **Estado:** Aceptada
- **Fecha:** 2026-11-20
- **Relacionada con:** [ADR-002](../adr/ADR-002-modelo-de-datos.md), RF-19, RF-07, RF-16

## Problema que resuelve

En el Modelo 1, una cara puede ser normal y de negocio a la vez, con dos estados
independientes. El riesgo es que el usuario se confunda al ver "verde de
predicación" y "verde de negocio" compitiendo por el mismo borde, y no sepa qué
está marcando.

## Regla

El usuario **nunca** gestiona las dos facetas de una cara al mismo tiempo. Trabaja
en **un modo a la vez**, y el modo activo determina qué ve y qué marca:

### Modo Predicación (por defecto)
- Es la vista normal, idéntica a la que la gente ya conocía.
- Se ven manzanas y caras en gris/verde (estado normal).
- Los negocios **no se ven ni se marcan** aquí.
- Marcar una cara aquí cambia **solo** `estado_normal`.

### Modo Negocios
- Se activa con un interruptor.
- Las caras normales se **atenúan**; solo resaltan las caras de negocio
  (`es_negocio=1`) con su color de negocio.
- Marcar una cara aquí cambia **solo** `estado_negocio`.
- Aparecen los maletines flotantes agregados.

### Matiz importante: "ver" no es "marcar" (ver RN-01)

La regla "un modo a la vez" aplica a **marcar** progreso, no a **ver** información:

- **Identificar** que una cara es de negocio ocurre **siempre**, también en modo
  Predicación. Las caras de negocio llevan un indicador visual (icono de maletín
  en SVG) sobre la arista y en el menú de la manzana, porque se predican en días
  especiales y el usuario debe distinguirlas en todo momento (RN-01).
- Lo que está separado por modo es el **acto de marcar**: en Predicación solo se
  marca `estado_normal`; en Negocios solo se marca `estado_negocio`.

Así el usuario nunca pierde de vista cuáles caras tienen negocio, sin mezclar el
marcado de casas y negocios.

## Flujos de usuario (sin confusión)

**Marcar progreso de predicación** (lo habitual):
1. Tocar una manzana → menú → lista de caras en gris/verde.
2. Tocar "Cara 3" → verde. No existe el concepto "negocio" en esta pantalla.

**Definir que una cara es de negocio** (configuración, poco frecuente):
1. En el menú de la manzana, cada cara tiene un icono de maletín apagado.
2. Tocar el maletín de "Cara 3" → esa cara adquiere la faceta de negocio
   (`es_negocio=1`). Sigue siendo cara normal para predicación.
3. Es un acto de configuración, separado de marcar progreso.

**Marcar progreso de negocio** (en Modo Negocios):
1. Activar el interruptor "Negocios".
2. El mapa resalta solo las caras de negocio.
3. Tocar "Cara 3" → su `estado_negocio` pasa a verde. El `estado_normal` no cambia.

## Antecedente

La app antigua ya tenía un `businessLayerActive` que, al activarse, ocultaba las
manzanas normales y mostraba solo las caras de negocio. El patrón de "dos modos"
ya era conocido por los usuarios; esta regla lo formaliza y lo integra con el
Modelo 1.

## Consecuencia

El usuario nunca duda "¿este verde es de predicación o de negocio?", porque el
modo activo se lo indica. La fidelidad del Modelo 1 se mantiene sin coste de
confusión.
