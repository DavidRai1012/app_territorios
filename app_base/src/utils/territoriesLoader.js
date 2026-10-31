// Cargador automático de todos los mapas de territorios locales
const mapModules = import.meta.glob('../../data/mapas/*.json', { eager: true });

export function getAllLocalTerritories() {
  const territories = [];

  for (const path in mapModules) {
    const data = mapModules[path]?.default || mapModules[path];
    if (data && data.numero_territorio) {
      territories.push(data);
    }
  }

  // Ordenar numéricamente por número de territorio
  territories.sort((a, b) => {
    const numA = parseInt(a.numero_territorio, 10) || 0;
    const numB = parseInt(b.numero_territorio, 10) || 0;
    return numA - numB;
  });

  return territories;
}
