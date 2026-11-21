// =====================================================================
// connectivity.js — Deteccion real de conexion a internet
// ---------------------------------------------------------------------
// navigator.onLine NO es fiable (puede decir "online" sin salida real a
// internet). Aqui se comprueba con un fetch corto y con timeout contra
// el servidor de tiles. Si responde, hay internet utilizable.
//
// Se usa para decidir entre el mapa ONLINE (OpenFreeMap) y el mapa
// LOCAL (PMTiles empaquetado) sin que el usuario tenga que elegir.
// =====================================================================

import { LIBERTY_STYLE_URL } from '../config/mapa';

// URL ligera para el "ping" de conectividad (el propio estilo Liberty).
const PING_URL = LIBERTY_STYLE_URL;

// Comprueba si hay internet utilizable. Devuelve Promise<boolean>.
// timeoutMs: tiempo maximo de espera antes de considerar "sin conexion".
export async function hayInternet(timeoutMs = 3500) {
  // Atajo: si el navegador declara estar offline, no intentamos la red.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // HEAD es mas ligero; si el server no lo admite, igual sirve para
    // confirmar que hubo respuesta de red.
    const res = await fetch(PING_URL, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal
    });
    clearTimeout(timer);
    return res.ok || res.type === 'opaque';
  } catch (e) {
    clearTimeout(timer);
    return false;
  }
}

// Suscribe callbacks a los eventos de conexion del navegador.
// Devuelve una funcion para cancelar la suscripcion.
export function observarConexion(onCambio) {
  if (typeof window === 'undefined') return () => {};
  const handler = () => {
    // Re-verificar de verdad; el evento solo es una pista.
    hayInternet().then((ok) => onCambio(ok));
  };
  window.addEventListener('online', handler);
  window.addEventListener('offline', handler);
  return () => {
    window.removeEventListener('online', handler);
    window.removeEventListener('offline', handler);
  };
}
