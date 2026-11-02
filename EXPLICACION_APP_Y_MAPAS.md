# Explicación Técnica y Funcional: App de Territorios

Este documento detalla el funcionamiento interno de la aplicación móvil de territorios, los proveedores cartográficos utilizados y las razones por las cuales algunas calles o trazados pueden presentar diferencias frente a la realidad actual en terreno.

---

## 1. ¿Cómo funciona la App?

La aplicación está construida sobre una arquitectura moderna y ligera enfocada en rendimiento móvil:

- **Motor Gráfico Vectorial (MapLibre GL JS)**: A diferencia de visores antiguos basados en imágenes fijas (raster/Leaflet), la app utiliza aceleración por hardware (WebGL). Esto permite:
  - Rotar e inclinar el mapa en 3D libremente con dos dedos.
  - Zoom continuo y fluido (hasta nivel 22) sin que se borre ni pierda nitidez la imagen.
  - Renderizado dinámico de nombres y polígonos: las etiquetas de texto de cada territorio escalan y se reposicionan automáticamente según el nivel de zoom, sin sobrecargar la memoria.
- **Formato de Datos GeoJSON (v3)**: Los 13 macro-territorios vienen empaquetados localmente dentro de la aplicación ([`territorios.json`](file:///c:/Users/usuario/Desktop/app_territorios/app_base/src/data/territorios.json)). No dependen de conexión a un servidor backend propio para consultar límites, áreas o descripciones.
- **Algoritmo de Centrado Óptimo (`labelPoint`)**: Para cada territorio, se calcula dinámicamente el punto interior más espacioso y alejado de los bordes mediante un escaneo geométrico en dos pasadas. Esto garantiza que el nombre del territorio siempre aparezca en el centro visual del polígono.
- **Empaquetado Nativo (Capacitor)**: La interfaz web se compila y encapsula directamente en un archivo APK de Android (`Territorios_v3_demo.apk`), funcionando como una aplicación móvil independiente.

---

## 2. ¿Qué mapas y capas cartográficas usa la App?

La aplicación integra dos capas base gratuitas y de alta calidad:

### A. Mapa de Calles y Edificios 3D: OpenFreeMap (Estilo Liberty)
- **Proveedor**: OpenFreeMap / OpenMapTiles.
- **Fuente de Datos**: OpenStreetMap (OSM), el proyecto colaborativo global de cartografía abierta más grande del mundo.
- **Tecnología**: Teselas vectoriales (`vector tiles` en formato PBF) servidas por un CDN global de alto rendimiento sin costo de API keys.
- **Características**: Incluye capas de vías, andenes, parques, cuerpos de agua y extrusión de edificios cuando se acerca el mapa.

### B. Vista Satelital Híbrida: Esri World Imagery
- **Proveedor**: Esri (ArcGIS World Imagery).
- **Características**: Ortofotos y mosaicos satelitales de alta resolución mundial (Maxar, Earthstar Geographics) combinados con la capa vectorial de nombres y vías superpuesta para facilitar la orientación.

---

## 3. ¿Por qué algunas calles no cuadran exactamente con las actuales?

Al comparar el mapa digital con el recorrido físico por los barrios, pueden notarse ciertas discrepancias. Esto se debe a 4 causas técnicas y cartográficas principales:

### 1. Frecuencia de actualización de OpenStreetMap (OSM)
- Las teselas vectoriales de OpenFreeMap se generan a partir de capturas periódicas de OpenStreetMap.
- En sectores en constante desarrollo urbano (como Suba, Lisboa, Toscana, Tibabuyes o Corinto), la apertura de nuevas vías peatonales, cerramientos de conjuntos residenciales, cambios de sentido vial o pavimentación de senderos tardan cierto tiempo en ser registrados y procesados por los servidores de teselas.

### 2. Disparidad entre la nomenclatura oficial y la popular
- En muchas localidades de Bogotá coexisten la nomenclatura catastral (Carrera / Calle numérica) y la nomenclatura barrial tradicional (diagonal, transversal, vía comunal o nombres de sectores).
- Si un trazado fue digitalizado con nombres antiguos o sin la actualización catastral más reciente de Catastro Distrital / IDECA, pueden verse pequeñas variaciones de numeración.

### 3. Precisión del trazado de los polígonos
- Los contornos de los territorios fueron trazados a mano sobre mapas satelitales o cartográficos de referencia. Si un vértice se dibujó por el separador central de una avenida o por la línea de paramento de las casas en lugar del eje vial, puede parecer que una manzana o acera quedó en el límite divisorio.

### 4. Fuentes de imágenes satelitales (Esri vs. Terreno)
- Las tomas satelitales globales de Esri/Maxar son ortorrectificadas y tienen fechas de captura específicas (en muchos casos de hace 1 a 3 años). Las obras de infraestructura recientes, talas, nuevos puentes o ampliaciones pueden no reflejarse de inmediato en la foto satelital de fondo.

---

## 4. Resumen de Archivos Clave del Proyecto

- **APK compilado listo para instalar**: [`Territorios_v3_demo.apk`](file:///c:/Users/usuario/Desktop/app_territorios/Territorios_v3_demo.apk) (4.48 MB).
- **Componente del Mapa**: [`app_base/src/components/MapLibreMap.jsx`](file:///c:/Users/usuario/Desktop/app_territorios/app_base/src/components/MapLibreMap.jsx).
- **Manejo de Estilos Cartográficos**: [`app_base/src/utils/mapStyleHelper.js`](file:///c:/Users/usuario/Desktop/app_territorios/app_base/src/utils/mapStyleHelper.js).
- **Cálculos Geométricos y Etiquetas**: [`app_base/src/utils/geoUtils.js`](file:///c:/Users/usuario/Desktop/app_territorios/app_base/src/utils/geoUtils.js).
- **Editor Cartográfico Web**: [`app_base/public/editor.html`](file:///c:/Users/usuario/Desktop/app_territorios/app_base/public/editor.html).
