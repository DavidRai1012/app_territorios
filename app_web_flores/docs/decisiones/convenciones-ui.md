# Convenciones de interfaz — App Web Flores

> Última actualización: 2026-11-20.

## UI-01: Iconos en SVG, no emojis

Toda la interfaz usa **iconos SVG**, no emojis. Esto aplica a todos los
indicadores (maletín de negocios, estados, acciones, botones de mapa, etc.).

Motivos:
- Apariencia consistente entre navegadores, sistemas operativos y dispositivos
  (los emojis se renderizan distinto en cada plataforma).
- Control de color, tamaño y estilo (un maletín SVG puede pintarse gris/amarillo/
  verde según el estado; un emoji no).
- Mejor para el empaquetado Android (fase H), donde los emojis del sistema varían.

Nota: la app apksuba usa emojis en algunos botones. En app web flores se parte de
SVG desde el inicio.
