# Proyecto Android: Visor de Territorios Suba (App Móvil)

Este documento detalla la arquitectura de la aplicación Android sencilla de territorios y el diagnóstico exacto de los fallos encontrados durante la compilación del APK con Gradle / Capacitor en GitHub Actions, para facilitar su revisión y solución rápida.

---

## 1. ¿Qué hace esta aplicación?

Es una aplicación móvil (Android) ligera y offline para la predicación en congregaciones:
1. **Modo Mapa Sencillo:** Muestra 37 territorios y sus manzanas con polígonos claros y números de manzana visibles.
2. **Selector y Filtro de Territorios:** Permite ver todos los territorios juntos, deseleccionar, o elegir con un toque "Ver solo este territorio" (para días especiales de predicación), haciendo zoom y encuadre automático a ese territorio.
3. **Alto Zoom sin pérdida (Estilo Rappi):** Usa mosaicos CartoDB Voyager (limpios, estilo Rappi/Uber) con overzoom configurado hasta nivel 22 (`maxNativeZoom: 20, maxZoom: 22`) para que al acercarse a las casas el mapa nunca se vuelva gris ni se pierda. Incluye también vista Satelital (Esri) y Calles (OSM).
4. **Tema visual Morado:** Paleta púrpura (`#7c3aed`, `#6d28d9`), badges circulares para manzanas y tarjetas limpias.
5. **Funciones opcionales con botones flotantes:**
   - 🎯 **GPS:** Ubicación en tiempo real con punto pulsante morado (apagado por defecto).
   - 🧭 **Brújula / Giroscopio:** Orientación del mapa según el teléfono (apagado por defecto).
6. **100% Offline:** Los 37 archivos JSON con las geometrías de los territorios están empaquetados en local (`src/utils/territoriesLoader.js`), por lo que no requiere servidor backend activo ni internet para consultar las manzanas.

---

## 2. Pila Tecnológica

- **Frontend:** React 18 + Vite + Leaflet 1.9.4 + Leaflet-Rotate.
- **Empaquetador Nativo:** Capacitor (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`).
- **Target Android:** Android SDK 34 / Java JDK 21 / Gradle 8.11.

---

## 3. Diagnóstico de los Fallos de Compilación (Gradle / GitHub Actions)

Al intentar compilar el APK automáticamente en el pipeline de GitHub Actions (`.github/workflows/build-apk.yml`), se presentaron los siguientes fallos secuenciales:

### ❌ Fallo 1: Incompatibilidad de versión de Java (`source release: 21`)
- **Log del error:**
  ```text
  > Task :capacitor-android:compileDebugJavaWithJavac FAILED
  error: invalid source release: 21
  ```
- **Causa:** El workflow inicialmente configuró JDK 17 (`java-version: '17'`), pero las versiones recientes de Capacitor compilan con `sourceCompatibility = JavaVersion.VERSION_21`.
- **Solución aplicada:** Subir el JDK del runner a Java 21 (`java-version: '21'`).

---

### ❌ Fallo 2: Clases duplicadas de Kotlin (`checkDebugDuplicateClasses`)
- **Log del error:**
  ```text
  > Task :app:checkDebugDuplicateClasses FAILED
  Duplicate class kotlin.collections.jdk8.CollectionsJDK8Kt found in modules:
    kotlin-stdlib-1.8.22.jar (org.jetbrains.kotlin:kotlin-stdlib:1.8.22)
    and kotlin-stdlib-jdk8-1.6.21.jar (org.jetbrains.kotlin:kotlin-stdlib-jdk8:1.6.21)

  Duplicate class kotlin.internal.jdk7.JDK7PlatformImplementations found in modules:
    kotlin-stdlib-1.8.22.jar
    and kotlin-stdlib-jdk7-1.6.21.jar
  ```
- **Causa:** En Kotlin 1.8+, las librerías `kotlin-stdlib-jdk7` y `kotlin-stdlib-jdk8` fueron absorbidas dentro de `kotlin-stdlib`. Una dependencia transitiva antigua sigue pidiendo `kotlin-stdlib-jdk8:1.6.21`, lo que provoca que el validador de clases de Gradle (`CheckDuplicatesRunnable`) detecte colisión de clases bytecode idénticas.
- **Solución recomendada para Gradle (`android/app/build.gradle` o `android/build.gradle`):**
  Excluir explícitamente los módulos obsoletos `kotlin-stdlib-jdk7` y `kotlin-stdlib-jdk8`:
  ```groovy
  configurations.all {
      exclude group: 'org.jetbrains.kotlin', module: 'kotlin-stdlib-jdk7'
      exclude group: 'org.jetbrains.kotlin', module: 'kotlin-stdlib-jdk8'
  }
  ```
  O forzar la resolución en `build.gradle`:
  ```groovy
  dependencies {
      constraints {
          implementation("org.jetbrains.kotlin:kotlin-stdlib-jdk7:1.8.22") {
              because("Merged into kotlin-stdlib")
          }
          implementation("org.jetbrains.kotlin:kotlin-stdlib-jdk8:1.8.22") {
              because("Merged into kotlin-stdlib")
          }
      }
  }
  ```

---

### ❌ Fallo 3: Error de sintaxis en el archivo YAML de GitHub Actions (Run exit code 0s)
- **Causa:** Al intentar inyectar el bloque Groovy usando `cat << 'EOF'` dentro de un bloque `run` de GitHub Actions en Linux, la sintaxis de heredoc o comillas rompió el parsing del script shell en el paso 5, provocando salida inmediata con error.
- **Solución:** Lo más limpio es tener la carpeta `android/` directamente generada y configurada en el repositorio o proyecto, con sus archivos Gradle ya ajustados, en lugar de generarla al vuelo con comandos `sed` y `cat` durante el build.

---

## 4. ¿Cómo compilar este proyecto en Android Studio?

1. En la carpeta del proyecto, ejecuta:
   ```bash
   npm install
   npm run build
   npx cap add android
   npx cap sync android
   ```
2. Abre la carpeta `android` en **Android Studio**.
3. En `app/build.gradle`, agrega:
   ```groovy
   configurations.all {
       exclude group: 'org.jetbrains.kotlin', module: 'kotlin-stdlib-jdk7'
       exclude group: 'org.jetbrains.kotlin', module: 'kotlin-stdlib-jdk8'
   }
   ```
4. En el menú superior de Android Studio: **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
5. El APK compilado quedará listo en: `app/build/outputs/apk/debug/app-debug.apk`.
