export const LIBERTY_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
export const ESRI_SATELLITE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

// --- Recursos locales para el mapa OFFLINE (empaquetados en la app) ---
// Archivo PMTiles con las tiles vectoriales de Suba (zoom 10-18).
// Se sirve como asset estatico desde /mapa/.
export const PMTILES_LOCAL_URL = 'mapa/suba.pmtiles';
// Estilo MapLibre local que apunta al PMTiles, glyphs y sprite locales.
export const LOCAL_STYLE_URL = 'mapa/estilo-local.json';

// Preferencia de modo de mapa base:
//   'auto'    -> online si hay internet, local si no (recomendado)
//   'online'  -> forzar siempre online
//   'offline' -> forzar siempre local (ahorra datos)
export const MAP_SOURCE_MODES = ['auto', 'online', 'offline'];

// Paleta de colores distintivos para territorios (evita que territorios vecinos repitan color)
export const TERRITORY_PALETTE = [
  '#7c3aed', // Morado
  '#0ea5e9', // Azul cielo
  '#f97316', // Naranja
  '#16a34a', // Verde
  '#e11d48', // Rosa / Carmín
  '#ca8a04', // Ámbar
  '#0d9488', // Verde azulado
  '#c026d3', // Fucsia
  '#2563eb', // Azul
  '#65a30d', // Lima
  '#d97706', // Ocre
  '#ec4899', // Rosa
  '#8b5cf6', // Violeta claro
  '#14b8a6'  // Turquesa
];

// Temas de la aplicación (variables de color primario)
export const APP_THEMES = [
  { id: 'morado', nombre: 'Morado', color: '#7c3aed', hover: '#6d28d9', light: '#f5f3ff', border: '#c4b5fd' },
  { id: 'azul', nombre: 'Azul', color: '#2563eb', hover: '#1d4ed8', light: '#eff6ff', border: '#93c5fd' },
  { id: 'verde', nombre: 'Verde', color: '#16a34a', hover: '#15803d', light: '#f0fdf4', border: '#86efac' },
  { id: 'naranja', nombre: 'Naranja', color: '#f97316', hover: '#ea580c', light: '#fff7ed', border: '#fdba74' },
  { id: 'rosa', nombre: 'Rosa', color: '#e11d48', hover: '#be123c', light: '#fff1f2', border: '#fca5a5' },
  { id: 'rojo', nombre: 'Rojo', color: '#dc2626', hover: '#b91c1c', light: '#fef2f2', border: '#fca5a5' },
  { id: 'grafito', nombre: 'Grafito', color: '#475569', hover: '#334155', light: '#f8fafc', border: '#cbd5e1' }
];

// Colores oficiales de la organizacion para los Salones del Reino.
// El primero es el color por defecto.
export const SALON_COLORES = [
  { id: 'azul_org', nombre: 'Azul organización', color: '#4a6da7' },
  { id: 'morado_org', nombre: 'Morado organización', color: '#5b3c88' }
];

// Color por defecto de los salones (primer preset de la organizacion).
export const SALON_COLOR_DEFAULT = SALON_COLORES[0].color;

export const STORAGE_KEYS = {
  TERRITORIOS: 'app_territorios_data_v3',
  SELECTED_IDS: 'app_territorios_selected_ids',
  THEME: 'app_territorios_theme_color',
  DARK_MODE: 'app_territorios_dark_mode',
  MAP_STYLE: 'app_territorios_map_style',
  MAP_TILT: 'app_territorios_map_tilt',
  AUTO_FIT: 'app_territorios_auto_fit',
  GROUPS: 'app_territorios_user_groups',
  // Salones del Reino
  SALON_COLOR: 'app_territorios_salon_color',
  SALONES_VISIBLE: 'app_territorios_salones_visible',
  SALONES_3D: 'app_territorios_salones_3d',
  // Modo de la fuente del mapa base (auto/online/offline)
  MAP_SOURCE_MODE: 'app_territorios_map_source_mode'
};
