# Requisitos no funcionales — App Web Flores

> Documento vivo. Se actualiza a medida que se definen requisitos.
> Última actualización: 2026-11-20.

## Escala y concurrencia

| ID | Requisito |
|---|---|
| RNF-01 | La app debe soportar el uso de ~10 personas, con un tope generoso de 100 usuarios totales y menos de 20 conexiones simultáneas. |
| RNF-02 | La base de datos (SQLite) debe garantizar integridad transaccional en escrituras concurrentes a esta escala. |

## Rendimiento

| ID | Requisito |
|---|---|
| RNF-03 | La vista inicial no debe cargar las 124 manzanas; solo los 37 polígonos de territorio con su color de estado. |
| RNF-04 | Las manzanas y caras se cargan bajo demanda (por territorio seleccionado). |
| RNF-05 | Las etiquetas de cara solo se muestran a partir de un nivel de zoom útil, no en todos los niveles. |
| RNF-06 | El mapa debe mantenerse fluido en dispositivos de escritorio y móviles. |
| RNF-07 | No se afirmará una mejora de rendimiento sin medición antes/después. |

## Compatibilidad

| ID | Requisito |
|---|---|
| RNF-08 | La interfaz debe funcionar en escritorio y en móvil (sin obligar a tocar aristas diminutas en pantallas pequeñas). |
| RNF-09 | El motor de mapa (satélite, 3D, estilos) se reutiliza de apksuba sin crear dependencia cruzada entre las dos apps. |

## Seguridad

| ID | Requisito |
|---|---|
| RNF-10 | El acceso por Internet debe protegerse con una clave compartida; no se permite edición anónima sin restricción. |
| RNF-11 | El servidor es el único proceso que escribe en la base de datos; los clientes nunca la tocan directamente. |
| RNF-12 | Las limitaciones de la protección temporal deben quedar documentadas (no es un sistema de cuentas). |

## Integridad de datos

| ID | Requisito |
|---|---|
| RNF-13 | No se inventan ni reemplazan datos geográficos; se usan los 37 territorios y 124 manzanas reales. |
| RNF-14 | Los estados de cara existentes se preservan al migrar desde el formato antiguo (`partStates.json`). |
| RNF-15 | No se cambia silenciosamente el significado geográfico de una cara si la geometría cambia (se marca "revisar"). |
| RNF-16 | Toda modificación del esquema de base de datos incluye script de migración, respaldo y estrategia de rollback. |

## Despliegue y operación

| ID | Requisito |
|---|---|
| RNF-17 | El despliegue debe cumplir las políticas de Oracle Cloud Always Free (sin actividad artificial para evadir inactividad). Se usa conversión a PAYG como mecanismo legítimo contra la reclamación por inactividad. Ver ADR-005. |
| RNF-24 | Deben abrirse ambos cortafuegos de Oracle (Security List en la consola + firewall de la VM) para 80/443. |
| RNF-25 | La app se sirve por HTTPS y WebSocket seguro (wss) mediante Caddy con certificado automático, en el dominio reutilizado `control-de-territorios-suba.mooo.com`. |
| RNF-18 | Priorizar bajo consumo de CPU, RAM y red. |
| RNF-19 | Debe existir una estrategia de respaldo del archivo de base de datos. |
| RNF-20 | La versión local debe probarse antes de migrar al servidor. |

## Mantenibilidad y futuro

| ID | Requisito |
|---|---|
| RNF-21 | La arquitectura debe permitir integrar en el futuro las funciones diferidas (autenticación, giroscopio, posicionamiento, reportes) sin rediseño mayor. |
| RNF-22 | Las decisiones técnicas importantes se documentan como ADR en `docs/adr/`. |
| RNF-23 | El APK de "app web flores" (fase final) debe ser independiente del APK de apksuba: distinto appId y nombre, sin compartir instalación. |
