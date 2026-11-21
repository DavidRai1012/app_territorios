# Carpeta `mapa/` — recursos del mapa sin conexión

Esta carpeta contiene los recursos locales del mapa de calles (modo offline).

| Archivo | ¿Qué es? | ¿Va al repo? |
|---------|----------|--------------|
| `estilo-local.json` | Estilo MapLibre que apunta al PMTiles local | Sí |
| `suba.pmtiles` | Tiles vectoriales de Suba (lo generas con Tilemaker) | No (es grande) |
| `glyphs/` | Fuentes para las etiquetas de calles | No (es grande) |

Para generar `suba.pmtiles` y los `glyphs/`, sigue la guía:
`docs/GUIA-MAPA-OFFLINE.md`.

Mientras `suba.pmtiles` no exista, la app usa el mapa online y no se rompe.
