# ADR-004: Protección de acceso (modo lectura, editores con PIN, admins)

- **Estado:** Aceptado
- **Fecha:** 2026-11-20
- **Ámbito:** `app_web_flores/`
- **Depende de:** [ADR-001](ADR-001-stack-tecnologico.md) (SQLite, Socket.IO),
  [ADR-003](ADR-003-sincronizacion-y-conflictos.md) (eventos de escritura)
- **Relacionado con función diferida:** RF-D1 (autenticación completa)

## Contexto

La app estará expuesta en Internet sin un sistema de cuentas completo (eso es
función diferida). Pero no puede quedar abierta a que cualquiera con la URL edite
el progreso. La app antigua **no validaba nada en el servidor**: su "modo lectura"
era solo del frontend (trivial de saltar) y no había autenticación real. Se diseña
la protección desde cero.

Escala real: ~10 personas conocidas. El objetivo es impedir ediciones de
desconocidos y tener una noción de **quién** hizo cada cambio, sin montar un
sistema de usuarios con contraseñas individuales fuertes.

## Decisión: tres niveles de acceso

### 1. Solo lectura (por defecto, sin credenciales)
- Cualquiera que abra la app puede **ver** el mapa, los territorios y el progreso.
- **No puede editar** nada. No se piden credenciales para mirar.
- Equivale al "Ver mapa" de la app antigua, pero aplicado de verdad en el servidor
  (los eventos de escritura se rechazan sin credencial válida).

### 2. Editor (PIN de 4 dígitos, por sesión)
- El admin registra a cada persona con **nombre + PIN de 4 dígitos**
  (ej. "Pepito Pérez" → `1234`).
- Para editar, la persona selecciona su nombre e introduce su PIN **una vez**: se
  abre una **sesión de editor** a su nombre.
- Durante la sesión, marca todas las caras/manzanas que quiera **sin volver a
  teclear el PIN** (pintado por sesión, no por acción).
- La sesión se cierra manualmente o caduca tras un tiempo de inactividad
  (valor a definir en implementación, p.ej. varias horas), y entonces se vuelve
  a pedir el PIN.
- Cada cambio queda asociado al **nombre del editor** (autoría blanda, ver §4).

### 3. Admin (contraseña fuerte, varios admins)
- Puede haber **varios admins**. Cada uno entra con **nombre + contraseña**
  (no un PIN: una contraseña fuerte).
- El admin puede:
  - Registrar / editar / eliminar personas y sus PIN.
  - Registrar / eliminar otros admins.
  - Ejecutar acciones protegidas (p.ej. limpiar progreso — equivalente al
    `clear_all` antiguo).
- Toda acción de admin se valida en el servidor.

## Cómo se aplica (flujo técnico)

- Al autenticarse (PIN de editor o contraseña de admin), el servidor valida y
  entrega un **token de sesión** que el navegador guarda (para no volver a pedir
  credencial en cada acción durante la sesión).
- **Todos los eventos de escritura** de Socket.IO (`cara:actualizar`,
  `manzana:completar`, `cara:tipo_negocio`, acciones de admin) exigen un token
  válido con el nivel adecuado. Sin token válido → el servidor **rechaza** el
  evento. No se confía en que el frontend oculte botones.
- Lectura (`estado:inicial`, difusiones) no requiere token: el modo lectura es
  abierto.

## Modelo de datos (añadido al esquema de ADR-002)

```sql
CREATE TABLE personas (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre       TEXT NOT NULL,
  pin_hash     TEXT NOT NULL,        -- hash bcrypt del PIN, NUNCA el PIN en claro
  activo       INTEGER NOT NULL DEFAULT 1,
  creado_en    TEXT NOT NULL
);

CREATE TABLE admins (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre         TEXT NOT NULL,
  password_hash  TEXT NOT NULL,      -- hash bcrypt de la contraseña, NUNCA en claro
  activo         INTEGER NOT NULL DEFAULT 1,
  creado_en      TEXT NOT NULL
);
```

Para autoría de cambios (autoría blanda), las tablas de progreso (`caras`, etc.)
pueden registrar opcionalmente `actualizado_por` (nombre del editor) y
`actualizado_en` (timestamp). Esto encaja con la evolución prevista en ADR-003 §3.

## Advertencias de seguridad (IMPORTANTE — esquema provisional para ~10 personas)

> Este esquema es **adecuado para un grupo pequeño y conocido (≈10 personas)**,
> no un sistema de seguridad robusto. Se asumen conscientemente estas limitaciones:

1. **Un PIN de 4 dígitos es débil por diseño**: solo 10.000 combinaciones. Es
   vulnerable a fuerza bruta.
   **Mitigación obligatoria:** el servidor debe **limitar intentos** (p.ej.
   bloquear temporalmente tras varios PIN fallidos por persona/IP). Aceptable solo
   porque el grupo es pequeño y conocido.

2. **La autoría es "blanda"**: como los PIN son cortos y el admin los configura,
   "lo marcó Pepito" sirve para **coordinación**, no como prueba fuerte de
   identidad (otra persona podría conocer el PIN de Pepito). La identidad fuerte
   llega con la autenticación diferida (RF-D1).

3. **Credenciales siempre con hash**: los PIN y las contraseñas de admin se guardan
   con **bcrypt**, nunca en texto plano, aunque el proyecto sea pequeño.

4. **La contraseña de admin debe ser fuerte** (no un PIN de 4 dígitos), porque el
   admin puede borrar progreso y gestionar personas. Se recomienda exigir una
   longitud mínima.

5. **Transporte cifrado**: toda la comunicación va por HTTPS / WebSocket seguro
   (wss) (ver futuro ADR-005 de despliegue), para que PIN y tokens no viajen en
   claro.

6. **Reversibilidad**: si un PIN o contraseña se filtra, el admin lo cambia; el
   token de esa sesión deja de ser válido.

## Camino de evolución (cuando el proyecto crezca)

- Sustituir PIN por contraseñas individuales fuertes + recuperación (RF-D1).
- Autoría fuerte con identidad verificable.
- Roles más finos si hiciera falta (p.ej. editor por zona).
- La arquitectura no lo impide: las tablas `personas`/`admins` y el token por
  sesión son la base sobre la que se construye la autenticación completa.

## Alternativas descartadas

| Alternativa | Por qué se descartó |
|---|---|
| Clave compartida única (todos la misma) | No da autoría: no se sabría quién marcó qué |
| VPN / red privada | Demasiado complejo para gente no técnica |
| Lista de IP permitidas | Las IP domésticas/móviles cambian; poco práctico |
| Solo protección en el frontend (como la app antigua) | Trivial de saltar; no protege de verdad |
