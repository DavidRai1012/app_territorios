# Diseño del menú de manzana e identificación de caras

- **Estado:** Aceptado
- **Fecha:** 2026-11-20
- **Resuelve:** el problema histórico de las manzanas irregulares con muchas caras
  donde el usuario no distinguía qué arista del mapa correspondía a cada "Cara N".
- **Relacionado con:** RF-11, RF-12, RF-13, RF-27, RF-28, RN-01, UI-01, A9.

## Problema

Una manzana irregular puede tener 8, 10 o más caras. En la app antigua el menú
listaba "Cara 1, Cara 2…" pero el usuario no sabía qué lado físico del polígono
era cada una. Marcaba a ciegas o se equivocaba.

## Solución: dos vías combinadas

### Vía 1 — Números sobre las aristas (solo con la manzana seleccionada)
Al seleccionar una manzana, cada arista muestra **su número** (1, 2, 3…) dibujado
sobre el punto medio del borde. Los números **aparecen solo cuando la manzana está
seleccionada/abierta** y se ocultan al cerrarla (opción intermedia). Así el usuario
ve el mapa de números solo de la manzana en la que trabaja, sin saturar el mapa.

### Vía 2 — Resaltado recíproco lista ↔ mapa
- Tocar "Cara N" en la lista → la arista correspondiente se resalta en el mapa
  (línea gruesa/acento, número agrandado); las demás se atenúan.
- (Futuro) Tocar la arista en el mapa → resalta el ítem en la lista. En esta
  versión, la selección se hace **solo desde la lista** (ver decisión 2).

## Decisiones de A9

| # | Decisión | Elegido |
|---|---|---|
| 1 | Visibilidad de números de arista | **Opción intermedia**: visibles solo con la manzana seleccionada |
| 2 | Cómo se marca una cara | **Solo desde la lista** por ahora (el toque directo en el mapa se evalúa después) |
| 3 | Ubicación del menú | **Panel inferior** (bottom sheet) en móvil; panel lateral en escritorio |
| 4 | Numeración de caras | **Orden del polígono**: número visible = índice + 1 |

## Encuadre con panel inferior (decisión 3, detalle)

Al seleccionar una manzana:
- El mapa **centra y encuadra** la manzana, pero compensando el espacio del panel
  inferior: se aplica un *padding inferior* igual a la altura del panel, de modo
  que la manzana queda en la **zona visible superior**, nunca escondida tras el
  panel.
- El usuario puede **mover el mapa libremente** (pan/zoom) en la zona visible
  mientras el panel está abierto.
- **Confirmado:** la manzana queda en la mitad superior visible (no tapada por el
  panel) y el mapa se puede arrastrar libremente en esa zona.

## Estructura del menú (contenido)

```
Cabecera:  Manzana N · Territorio T · estado agregado (gris/amarillo/verde)
Botón grande:  COMPLETAR MANZANA   (marca todas las caras normales; 1 transacción)
Lista de caras:  por cada cara → número, estado (sin hacer / hecha),
                 marca de negocio si aplica (icono maletín SVG, siempre visible, RN-01)
Acción:  Deshacer completar   (revierte al estado previo, RF-12)
```

- "Completar manzana" solo afecta el estado **normal** (modo predicación); no toca
  el estado de negocio.
- Tras completar, el usuario puede seguir cambiando caras individuales.
- Todos los iconos en SVG, no emojis (UI-01).

## Accesibilidad / móvil

- No se exige tocar aristas diminutas: la vía principal de marcado es la lista.
- El panel inferior es cómodo para el pulgar en móvil.
- Escritorio: panel lateral con la misma lógica.
