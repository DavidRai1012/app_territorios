# App Web Flores

Aplicación web de gestión de territorios de predicación: registro de progreso de
caras, manzanas, territorios y negocios, con sincronización en tiempo real entre
varios dispositivos.

Es independiente de **apksuba** (la app Android de visualización). Comparte solo
los datos geográficos reales (37 territorios, 124 manzanas), copiados a `datos/`.

## Estructura

```
app_web_flores/
├─ cliente/            Frontend React + Vite + MapLibre GL (satélite + 3D)
├─ servidor/           Backend Node + Express + Socket.IO + SQLite
│  ├─ logica/          Cálculo de estados (manzana, territorio, negocios)
│  └─ package.json
├─ datos/              Datos fuente para la migración
│  ├─ mapas/           territorio_1.json .. territorio_37.json (37 territorios reales)
│  ├─ partStates.json  Estados de caras y negocios existentes (formato antiguo)
│  └─ activityLog.json Registro de actividad antiguo (referencia)
├─ scripts/            Importación y verificación de datos
├─ backups/            Respaldos previos a migraciones
└─ docs/              Documentación (ADR, requisitos, decisiones)
```

## Documentación

Ver [`docs/README.md`](docs/README.md) para el índice completo (ADR, requisitos
funcionales y no funcionales, decisiones de diseño).

## Estado

En construcción — **Fase A** (esqueleto + datos + migración). Ver
[`docs/PENDIENTES.md`](docs/PENDIENTES.md).
