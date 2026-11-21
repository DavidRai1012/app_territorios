// =====================================================================
// pmtilesLocal.js — Mapa sin conexion cargado en memoria
// ---------------------------------------------------------------------
// Problema que resuelve:
//   La libreria PMTiles lee el archivo por trozos (peticiones HTTP Range).
//   El servidor interno de Capacitor en Android (WebViewLocalServer.java)
//   responde a esas peticiones con el archivo COMPLETO desde el byte 0,
//   pero lo marca como si fuera el trozo pedido. Resultado: datos
//   equivocados y mapa en blanco dentro del APK.
//
// Solucion:
//   Descargar el archivo local completo una sola vez (peticion normal, sin
//   Range) y servir los trozos desde memoria. El archivo pesa ~2.6 MB, un
//   costo bajo incluso en telefonos con poca RAM. Funciona igual en el
//   navegador y en Android.
// =====================================================================

import maplibregl from 'maplibre-gl';
import { PMTiles, Protocol } from 'pmtiles';
import { PMTILES_LOCAL_URL } from '../config/mapa';

// Instancia unica del protocolo "pmtiles://" para toda la app.
const protocolo = new Protocol();
let protocoloRegistrado = false;

// Registra el protocolo en MapLibre una sola vez.
export function registrarProtocoloPmtiles() {
  if (protocoloRegistrado) return;
  maplibregl.addProtocol('pmtiles', protocolo.tile);
  protocoloRegistrado = true;
}

// Fuente PMTiles que lee desde un ArrayBuffer en memoria.
class FuenteEnMemoria {
  constructor(clave, buffer) {
    this.clave = clave;
    this.buffer = buffer;
  }

  // La clave debe coincidir con la URL del estilo sin "pmtiles://".
  getKey() {
    return this.clave;
  }

  async getBytes(offset, length) {
    return { data: this.buffer.slice(offset, offset + length) };
  }
}

let cargaEnCurso = null;

// Carga el .pmtiles local en memoria y lo registra en el protocolo.
// Devuelve Promise<boolean>: true si quedo listo, false si fallo.
export function cargarPmtilesLocal() {
  if (cargaEnCurso) return cargaEnCurso;

  registrarProtocoloPmtiles();

  cargaEnCurso = fetch(PMTILES_LOCAL_URL)
    .then((res) => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.arrayBuffer();
    })
    .then((buffer) => {
      protocolo.add(new PMTiles(new FuenteEnMemoria(PMTILES_LOCAL_URL, buffer)));
      return true;
    })
    .catch((err) => {
      console.warn('No se pudo cargar el mapa sin conexion:', err);
      cargaEnCurso = null; // permite reintentar mas tarde
      return false;
    });

  return cargaEnCurso;
}
