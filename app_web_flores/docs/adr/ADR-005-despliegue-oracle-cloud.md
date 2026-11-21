# ADR-005: Despliegue en Oracle Cloud Always Free

- **Estado:** Plan documentado. **Decisión pendiente:** Always Free vs Pay As You Go (el usuario la tomará al final, antes de la Fase G). Ejecución en Fase G.
- **Fecha:** 2026-11-20
- **Ámbito:** `app_web_flores/`
- **Depende de:** ADR-001 (stack), ADR-004 (acceso/HTTPS)

> Datos de Oracle verificados en documentación oficial y fuentes de 2026
> (noviembre 2026). El contenido fue reformulado para cumplir con las
> restricciones de licencia de las fuentes. Las condiciones del nivel gratuito de
> Oracle **cambian**; reverificar antes de ejecutar la Fase G.

## Contexto

Se cierra la etapa en AWS (cuenta ya cerrada). El nuevo destino es **Oracle Cloud
Always Free**. El usuario parte **de cero** (sin cuenta Oracle) y quiere
**reutilizar el dominio** `control-de-territorios-suba.mooo.com` (FreeDNS
gratuito, ya usado por la app antigua).

## Recursos Always Free vigentes (verificados, nov 2026)

| Recurso | Límite Always Free actual | Fuente |
|---|---|---|
| Ampere A1 (ARM) | **2 OCPU + 12 GB RAM** en total por tenancy (1.500 OCPU-h + 9.000 GB-h/mes). *Recortado en 2026 desde 4 OCPU/24 GB.* | docs.oracle.com, linuxiac.com |
| x86 AMD micro (E2.1.Micro) | Hasta 2 instancias de 1/8 OCPU + 1 GB RAM c/u | github (oci-arm-retry) |
| Almacenamiento (boot/block) | 200 GB en total, mínimo 50 GB por instancia | gist rssnyder |
| Tráfico de salida | 10 TB/mes (holgado para esta app) | docs.oracle.com |

## Decisión de forma de instancia

**Recomendado: 1 instancia Ampere A1 con 1 OCPU + 6 GB RAM** (o 2 OCPU/12 GB si
está disponible al crearla). Motivos:

- Sobra para Node + Socket.IO + SQLite + Caddy con ~10 usuarios.
- Deja margen por si en el futuro se añade algo (el recorte de 2026 aún deja
  recursos suficientes).
- Alternativa de respaldo: **x86 E2.1.Micro (1 GB RAM)** si no hay capacidad ARM
  disponible en la región (la disponibilidad de A1 a veces falla al crear). 1 GB
  es ajustado pero viable para esta app ligera; se puede empezar ahí y migrar a
  A1 cuando haya capacidad.

## Arquitectura de despliegue

```
Internet
   │  (HTTPS 443 / WSS)
   ▼
┌──────────────── VM Oracle (Ubuntu LTS, ARM A1) ────────────────┐
│  Caddy  ──reverse_proxy──►  Node.js (Express + Socket.IO :3000) │
│   │  (HTTPS automático,                     │                   │
│   │   certificado Let's Encrypt)            ▼                   │
│   │                                     SQLite (archivo .db)    │
│   └── dominio: control-de-territorios-suba.mooo.com             │
└────────────────────────────────────────────────────────────────┘
```

Reutiliza el patrón de `para_servidor/` del repo (Caddy + Docker ya existían).
El `Caddyfile` antiguo ya apuntaba a este dominio:
`control-de-territorios-suba.mooo.com { reverse_proxy app:3000 }`.

## Componentes

| Componente | Elección |
|---|---|
| Sistema operativo | Ubuntu LTS (ARM) |
| Backend | Node.js 20 + Express + Socket.IO |
| Base de datos | SQLite (archivo en el disco de la VM) |
| Frontend | build de Vite servido por el backend (o por Caddy) |
| Reverse proxy / HTTPS | Caddy (certificado automático, renovación sola) |
| Dominio | `control-de-territorios-suba.mooo.com` (FreeDNS, reutilizado) |
| Firewall | abrir solo 80 y 443; cerrar el resto |

### Firewall (doble capa)
Oracle tiene **dos** cortafuegos que hay que abrir ambos (error típico):
1. **Security List / NSG** en la consola de Oracle (reglas de entrada 80/443).
2. **iptables/ufw dentro de la VM** (Ubuntu en Oracle trae iptables restrictivo
   por defecto).

### DNS
Apuntar el registro A de `control-de-territorios-suba.mooo.com` a la **IP pública**
de la VM Oracle. Caddy emite el certificado HTTPS automáticamente al resolver el
dominio.

## Política de inactividad (CRÍTICO — y cómo se cumple)

**Hallazgo verificado:** Oracle puede **reclamar** instancias Always Free
consideradas inactivas si, durante **7 días seguidos**, el uso queda por debajo del
20 % en CPU (percentil 95), red y memoria. Primero se **detiene** la instancia;
luego hay un periodo (~90 días) antes del borrado definitivo.

**El prompt prohíbe generar actividad artificial (CPU/red/RAM falsa) para evadir
esta política, y Oracle lo desaconseja.** Por tanto **NO** se usarán scripts de
"keep-alive" que inflen el uso artificialmente.

**Solución legítima recomendada: convertir la cuenta a "Pay As You Go" (PAYG).**
- Con PAYG, Oracle **deja de reclamar** instancias por inactividad.
- **No genera cobros** mientras el consumo se mantenga dentro de los límites
  Always Free (que esta app no supera).
- Requiere una tarjeta en el registro (igual que la cuenta gratuita), pero sin
  cargos si no se exceden los límites.
- Es la vía que el propio ecosistema de Oracle sugiere para instancias que
  legítimamente tienen poco tráfico, sin violar términos.

**Alternativa si no se quiere PAYG:** aceptar el riesgo y asumir que, si la app
pasa 7 días con muy poco uso, la instancia podría detenerse y habría que
reencenderla manualmente (los datos en el boot volume sobreviven a un *stop*; el
riesgo real es el borrado tras el periodo largo de inactividad total). Para una
app que ~10 personas usan con regularidad, el uso real probablemente supere el
umbral varios días; aun así, PAYG es el seguro correcto.

## Respaldo

- SQLite = un archivo. Respaldo = copiarlo periódicamente (cron diario) a:
  - otra ubicación de la VM, y/o
  - Object Storage de Oracle (10 GB Always Free), y/o
  - descarga manual periódica.
- Antes de cada despliegue nuevo, copia del `.db`.

## Monitoreo (bajo consumo)

- Healthcheck simple (endpoint `/salud` que responde 200).
- Revisar uso en la consola de Oracle (CPU/red) ocasionalmente.
- Sin agentes pesados de monitoreo (consumirían recursos de la VM pequeña).

## Orden de ejecución (Fase G, tras validar en local)

1. Crear cuenta Oracle Cloud y (recomendado) convertir a PAYG.
2. Crear VM Ampere A1 (Ubuntu LTS), guardar la clave SSH.
3. Abrir 80/443 en Security List y en el firewall de la VM.
4. Instalar Node, clonar la app, construir el frontend, iniciar el backend.
5. Instalar Caddy, configurar el `Caddyfile` con el dominio.
6. Apuntar el DNS `.mooo.com` a la IP pública; verificar HTTPS + wss.
7. Configurar respaldo del `.db` (cron) y healthcheck.
8. Probar desde varios dispositivos y redes.

> No se migra hasta que la versión local esté probada (regla 17 del prompt y
> RNF-20).

## Riesgos y limitaciones (documentados)

- **El nivel gratuito de Oracle puede cambiar** (ya se recortó en 2026). No hay
  garantía permanente. Mitigación: SQLite + app portable → mudarse a otro
  proveedor es simple si hiciera falta.
- **Disponibilidad de A1**: a veces Oracle no tiene capacidad ARM libre al crear la
  instancia. Mitigación: reintentar en otra *availability domain* o empezar con
  x86 micro.
- **Cuenta abandonada**: cuentas sin actividad 30+ días pueden suspenderse
  (distinto de la reclamación de instancia). PAYG + uso real lo evitan.
