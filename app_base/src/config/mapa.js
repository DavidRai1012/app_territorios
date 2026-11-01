export const LIBERTY_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
export const ESRI_SATELLITE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

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

export const STORAGE_KEYS = {
  TERRITORIOS: 'app_territorios_data_v3',
  SELECTED_IDS: 'app_territorios_selected_ids',
  THEME: 'app_territorios_theme_color',
  DARK_MODE: 'app_territorios_dark_mode',
  MAP_STYLE: 'app_territorios_map_style',
  MAP_TILT: 'app_territorios_map_tilt',
  AUTO_FIT: 'app_territorios_auto_fit',
  GROUPS: 'app_territorios_user_groups'
};
