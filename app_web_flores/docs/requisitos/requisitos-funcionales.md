# Requisitos funcionales — App Web Flores

> Documento vivo. Se actualiza a medida que se definen requisitos.
> Última actualización: 2026-11-20.
> Estado de cada RF: `Propuesto` · `Aprobado` · `Implementado` · `Verificado`.

## Visualización y selección de territorios

| ID | Requisito | Estado |
|---|---|---|
| RF-01 | La app muestra los 37 territorios al abrir, con su color de estado general, sin cargar manzanas individuales. | Propuesto |
| RF-02 | El usuario puede seleccionar un territorio. | Propuesto |
| RF-03 | Acción "Mostrar solo este": centra el mapa en el territorio, ajusta el zoom y carga solo sus manzanas. | Propuesto |
| RF-04 | Acción "Mostrar todos": muestra los 37 territorios y carga todas las manzanas. | Propuesto |
| RF-05 | El usuario puede seleccionar varios territorios (añadir, quitar, todos, limpiar selección). | Propuesto |

## Manzanas y caras

| ID | Requisito | Estado |
|---|---|---|
| RF-06 | Cada manzana se representa como un polígono; cada arista del polígono es una cara. | Propuesto |
| RF-07 | Cada cara normal tiene exactamente dos estados: "sin hacer" (gris) y "hecha" (verde). | Propuesto |
| RF-08 | El usuario puede marcar una cara como hecha o sin hacer de forma independiente. | Propuesto |
| RF-09 | El estado general de la manzana se calcula de sus caras: gris (ninguna), amarillo (algunas), verde (todas). | Propuesto |
| RF-10 | El estado general del territorio se calcula de sus manzanas: gris, amarillo, verde. | Propuesto |
| RF-11 | Menú de manzana con botón "Completar manzana" (marca todas las caras normales como hechas) y lista de caras con su estado. | Propuesto |
| RF-12 | El usuario puede deshacer "Completar manzana" y seguir cambiando caras individuales después. | Propuesto |
| RF-13 | Al seleccionar una cara en la lista, el mapa resalta la arista correspondiente y muestra su número. | Aprobado |
| RF-41 | Al seleccionar una manzana, cada arista muestra su número sobre el borde; los números solo aparecen con la manzana seleccionada y se ocultan al cerrarla. | Aprobado |
| RF-42 | En esta versión, marcar una cara se hace solo desde la lista del menú (no por toque directo en la arista del mapa). | Aprobado |
| RF-43 | El menú de manzana es un panel inferior (bottom sheet) en móvil y lateral en escritorio. Al abrirlo, el mapa encuadra la manzana compensando el espacio del panel, dejando la manzana visible en la zona superior, y permite mover el mapa libremente. | Aprobado |
| RF-44 | La numeración de caras sigue el orden del polígono (número visible = índice + 1). | Aprobado |

## Negocios

| ID | Requisito | Estado |
|---|---|---|
| RF-14 | El usuario puede marcar una cara de manzana existente como cara de negocio, preservando su relación con la manzana (Modelo 1, doble faceta). | Aprobado |
| RF-15 | ~~Geometrías de negocio independientes (tipo B)~~. **Descartado**: todo negocio se asigna a una cara de comercios existente. Ver ADR-002. | Descartado |
| RF-16 | Cada cara de negocio individual tiene dos estados: "sin hacer" (gris) y "hecha" (verde). El estado responde a "¿se hicieron todos los negocios de esa cara?" (binario por cara, sin importar cuántos negocios haya). | Aprobado |
| RF-17 | Un icono de maletín flotante muestra el progreso agregado de negocios: gris (ninguno), amarillo (algunos), verde (todos). | Aprobado |
| RF-18 | El maletín aparece solo en manzanas/territorios que contienen caras de negocio. | Aprobado |
| RF-19 | El progreso de negocios se calcula y visualiza aparte del progreso normal; el usuario puede aislar la vista de negocios. | Aprobado |
| RF-26 | Regla "un modo a la vez": predicación y negocios se marcan en modos separados; nunca en la misma pantalla. El usuario cambia de modo con un interruptor. Ver `docs/decisiones/regla-un-modo-a-la-vez.md`. | Aprobado |
| RF-27 | El maletín de una manzana se ancla sobre su cara de negocio. El maletín de un territorio se coloca automáticamente en el punto interior más amplio del polígono (algoritmo `labelPoint`), sin que el usuario elija posición. | Aprobado |
| RF-28 | Definir una cara como de negocio es una acción de configuración (icono de maletín por cara en el menú de la manzana), separada de marcar progreso. | Aprobado |

## Tiempo real y persistencia

| ID | Requisito | Estado |
|---|---|---|
| RF-20 | Los cambios se sincronizan en tiempo real entre varios dispositivos (Socket.IO). | Propuesto |
| RF-21 | Todo cambio se valida y persiste en la base de datos antes de difundirse a los demás dispositivos. | Propuesto |
| RF-22 | Al reconectar tras un corte de red, el dispositivo recupera el estado actual completo. | Aprobado |
| RF-23 | La app es accesible desde varios dispositivos por Internet, con tres niveles de acceso (ver RF-34 a RF-39). | Aprobado |
| RF-30 | El cambio del usuario se refleja al instante en su pantalla (pintado optimista) y se revierte si el servidor rechaza la operación. | Aprobado |
| RF-31 | Los cambios marcados sin conexión se guardan en una cola local y se reenvían automáticamente al reconectar. | Aprobado |
| RF-32 | La app muestra un indicador visible cuando está sin conexión, informando que los cambios se guardarán al reconectar. | Aprobado |
| RF-33 | La selección de territorios, el modo activo y la vista del mapa son locales de cada dispositivo; no se sincronizan. Solo se sincroniza el progreso (caras, manzanas, negocios). | Aprobado |

## Mapas

| ID | Requisito | Estado |
|---|---|---|
| RF-24 | La app ofrece mapa de calles y mapa satélite híbrido. | Propuesto |
| RF-25 | La app ofrece visualización 3D (inclinación del mapa). | Propuesto |

## Acceso y roles

| ID | Requisito | Estado |
|---|---|---|
| RF-34 | Modo solo lectura por defecto: cualquiera puede ver el mapa y el progreso sin credenciales, pero no editar. | Aprobado |
| RF-35 | Modo editor: cada persona tiene nombre + PIN de 4 dígitos (configurado por un admin); introduce su PIN una vez para abrir una sesión de editor. | Aprobado |
| RF-36 | El PIN se pide una vez por sesión (pintado por sesión); el editor marca varias caras sin reintroducirlo. La sesión caduca por inactividad o cierre. | Aprobado |
| RF-37 | Modo admin: varios admins, cada uno con nombre + contraseña fuerte. Pueden gestionar personas, PIN, otros admins y ejecutar acciones protegidas (p.ej. limpiar progreso). | Aprobado |
| RF-38 | Todos los eventos de escritura se validan en el servidor con token de sesión del nivel adecuado; sin token válido se rechazan. | Aprobado |
| RF-39 | Cada cambio queda asociado al nombre del editor que lo hizo (autoría blanda). | Aprobado |
| RF-40 | El servidor limita los intentos de PIN fallidos para mitigar la fuerza bruta. | Aprobado |

## Empaquetado Android (fase final)

| ID | Requisito | Estado |
|---|---|---|
| RF-29 | Al final del proyecto, empaquetar una app Android de "app web flores" (con su información y funcionalidad), separada e independiente de apksuba. | Aprobado |

## Funciones diferidas (NO en la versión inicial)

| ID | Requisito | Estado |
|---|---|---|
| RF-D1 | Autenticación completa con cuentas de usuario y contraseñas. | Diferido |
| RF-D2 | Integración de giroscopio en móvil. | Diferido |
| RF-D3 | Posicionamiento geográfico en tiempo real de los usuarios. | Diferido |
| RF-D4 | Registro de trabajo, histórico y generación de reportes. | Diferido |
