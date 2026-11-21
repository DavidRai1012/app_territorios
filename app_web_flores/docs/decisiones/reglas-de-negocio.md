# Reglas de negocio — App Web Flores

> Reglas del dominio (cómo funciona la predicación de territorios), independientes
> de la tecnología. Última actualización: 2026-11-20.

## RN-01: Las caras de negocio se predican en días especiales y deben identificarse siempre

Las caras de negocio corresponden a calles con locales comerciales, que se
predican en **días especiales**, aparte de la predicación normal de casas.

Por eso, el usuario debe poder **identificar** qué caras son de negocio **en todo
momento**, incluso mientras trabaja en modo Predicación normal.

**Distinción clave entre "ver" y "marcar":**

- **Identificar/ver** que una cara es de negocio: ocurre **siempre**. En modo
  Predicación, las caras de negocio llevan un indicador visual (icono de maletín,
  SVG) sobre la arista y en el menú de la manzana. Esto no cambia su estado.
- **Marcar el progreso** de negocio de una cara: ocurre **solo** en modo Negocios
  (ver regla "un modo a la vez").

Así el usuario nunca pierde de vista cuáles caras tienen negocio, pero sigue
marcando casas y negocios en momentos separados.

## RN-02: Casas y negocios de una misma cara son progresos separados

Una misma cara (arista de manzana) puede tener casas y negocios a la vez. La app
guarda **dos estados independientes** para esa cara:

- `estado_normal`: responde "¿se predicaron las casas de esta cara?"
- `estado_negocio`: responde "¿se hicieron los negocios de esta cara?"

Consecuencia: la app siempre deja claro, por ejemplo, que **se hicieron las casas
pero no los negocios** de una cara (normal en verde, negocio en gris). Nunca se
mezclan ni se deducen uno del otro.

## RN-03: Estado de negocio de una cara es binario

El estado de negocio de una cara responde a "¿se hicieron **todos** los negocios
de esa cara?": verde (sí) o gris (no). No importa cuántos negocios haya físicamente
en la cara. Nunca amarillo en la cara individual (el amarillo es solo para
agregados: manzana y territorio).

## RN-04: Todo negocio pertenece a una cara

No existen negocios con geometría propia independiente (tipo B descartado). Si hay
un negocio suelto, el administrador de territorios lo asigna a una cara de
comercios existente. Por tanto, todo negocio pertenece a una manzana y a un
territorio.
