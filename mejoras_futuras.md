# Lista de Tareas y Mejoras Futuras (App de Territorios)

Esta lista contiene ideas y mejoras pendientes para implementar en el futuro cuando dispongas de más créditos o tiempo.

## 1. Solución de Geolocalización en Producción (AWS)
- [ ] **Problema:** El botón de "Mi ubicación" funciona en local pero no en el servidor AWS.
- [ ] **Razón:** Los navegadores web (Chrome, Safari, etc.) bloquean el acceso al GPS del dispositivo celular si la página web no tiene un certificado de seguridad (HTTPS). En local funciona porque los navegadores confían en `localhost` por defecto.
- [ ] **Solución:** Configurar un dominio real (ej. `mis-territorios.com`) o usar un proxy inverso como **Nginx + Let's Encrypt** en el servidor de AWS para obtener un certificado SSL gratuito y habilitar el protocolo HTTPS.

## 2. Mejoras en la Interfaz de Usuario (UI/UX)
- [ ] **Panel de Administración:** Crear una pantalla donde un administrador pueda ver el progreso global de todos los territorios en tiempo real sin tener que ir buscando en el mapa.
- [ ] **Modo Oscuro Automático:** Implementar soporte para modo oscuro dependiendo de la configuración del celular del usuario, mejorando la visibilidad al sol o de noche.
- [ ] **Filtros de Búsqueda:** Añadir una barra de búsqueda para saltar rápidamente a un territorio o manzana específica ingresando el número.

## 3. Optimizaciones de Rendimiento
- [ ] **Carga Diferida (Lazy Loading) de Mapas:** Si se suben cientos de territorios, cargar todos los polígonos al mismo tiempo podría poner lenta la app. Implementar una carga por "cuadrantes" o solo cargar los territorios visibles en la pantalla en ese momento.
- [ ] **Base de Datos Real:** Actualmente se usa `data.json` para guardar el progreso. Para mayor seguridad y escalabilidad, migrar esto a una base de datos real y gratuita como **SQLite** o **PostgreSQL**.

## 4. Herramientas del Editor
- [ ] **Edición Posterior:** Permitir seleccionar una manzana ya dibujada en el editor para mover sus puntos sin tener que borrarla y dibujarla de nuevo.
- [ ] **Snapping (Pegado Automático):** Hacer que al dibujar una manzana, los bordes se "peguen" automáticamente a la manzana vecina para no dejar espacios vacíos entre ellas.
