// Genera docs/design/mockups.html con las 10 pantallas del PRD (sección 13) y sus estados.
// Uso: node docs/design/generar-mockups.mjs
// Los colores salen de los mismos tokens de la app (apps/mobile/src/presentation/theme/tokens.ts).
import { readFileSync, writeFileSync } from 'node:fs';
import { URL, fileURLToPath } from 'node:url';
import { stdout } from 'node:process';

const tokensSource = readFileSync(
  fileURLToPath(new URL('../../apps/mobile/src/presentation/theme/tokens.ts', import.meta.url)),
  'utf8',
);
const colorsBlock = tokensSource.slice(tokensSource.indexOf('export const colors'), tokensSource.indexOf('} as const;'));
const c = Object.fromEntries([...colorsBlock.matchAll(/(\w+):\s*'(#[0-9A-Fa-f]{6})'/g)].map((m) => [m[1], m[2]]));

const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// --- Piezas (equivalen a los componentes de presentation/components) ---
const btn = (label, variant = 'primary', state = '') =>
  `<button class="btn ${variant} ${state}" ${state === 'disabled' || state === 'loading' ? 'disabled' : ''} aria-label="${esc(label)}">${state === 'loading' ? '<span class="spin" aria-hidden="true"></span>' : ''}${esc(label)}</button>`;
const field = (label, value = '', error = '') =>
  `<div class="field"><label>${esc(label)}</label><div class="input ${error ? 'err' : ''}">${esc(value) || '&nbsp;'}</div>${error ? `<p class="fielderr" role="alert">${esc(error)}</p>` : ''}</div>`;
const banner = (tone, message, action = '') =>
  `<div class="banner ${tone}"><p>${esc(message)}</p>${action ? `<span class="bannerbtn">${esc(action)}</span>` : ''}</div>`;
const card = (title, ...lines) =>
  `<div class="card"><h3>${esc(title)}</h3>${lines.map((l) => `<p>${esc(l)}</p>`).join('')}</div>`;
const loader = (label) => `<div class="loader"><span class="spin big" aria-hidden="true"></span><p>${esc(label)}</p></div>`;
const empty = (title, hint) => `<div class="empty"><h3>${esc(title)}</h3><p>${esc(hint)}</p></div>`;
const bar = (title) => `<header class="appbar"><h2>${esc(title)}</h2></header>`;
const tabs = (active) =>
  `<nav class="tabs">${['Inicio', 'Historial', 'Alertas', 'Ajustes']
    .map((t) => `<span class="${t === active ? 'on' : ''}">${t}</span>`)
    .join('')}</nav>`;
const body = (...parts) => `<div class="screen">${parts.join('')}</div>`;

// --- Pantallas ---
const emergencia = (extra = '') =>
  body(
    bar('Tarjeta de emergencia'),
    extra,
    card('Tipo de sangre', 'O positivo'),
    card('Alergias', 'Penicilina (grave)', 'Nueces (moderada)'),
    card('Medicamentos', 'Metformina 850 mg · cada 12 h', 'Clonazepam 0.5 mg · controlado'),
    card('Contactos de emergencia', 'Ana Pérez (madre) · 999 123 4567'),
    tabs('Inicio'),
  );

const screens = [
  {
    id: 'bienvenida',
    titulo: '1. Bienvenida y registro',
    pila: '(auth)',
    estados: [
      ['Normal', body('<h1>LifeSync</h1><p class="lead">Tu historial médico de emergencia, siempre contigo.</p>', btn('Iniciar sesión'), btn('Crear cuenta', 'secondary'))],
      ['Cargando', body('<h1>LifeSync</h1>', btn('Iniciar sesión', 'primary', 'loading'), btn('Crear cuenta', 'secondary', 'disabled'), loader('Abriendo el navegador…'))],
      ['Error', body('<h1>LifeSync</h1>', banner('error', 'No pudimos iniciar sesión. Inténtalo de nuevo.'), btn('Iniciar sesión'), btn('Crear cuenta', 'secondary'))],
      ['Sin conexión', body('<h1>LifeSync</h1>', banner('offline', 'Sin conexión. Conéctate a internet para iniciar sesión.', 'Reintentar'), btn('Iniciar sesión', 'primary', 'disabled'))],
      ['Registro: error de validación', body(bar('Crear cuenta'), field('Correo electrónico', 'ana@correo', 'Escribe un correo válido'), field('Contraseña', '••••••', 'Mínimo 12 caracteres'), btn('Crear cuenta'))],
      ['Registro: cargando', body(bar('Crear cuenta'), field('Correo electrónico', 'ana@correo.com'), field('Contraseña', '••••••••••••••'), btn('Creando cuenta…', 'primary', 'loading'))],
      ['Registro: correo ya registrado', body(bar('Crear cuenta'), banner('error', 'Ese correo ya está registrado. Inicia sesión.'), field('Correo electrónico', 'ana@correo.com'), field('Contraseña', '••••••••••••••'), btn('Crear cuenta'))],
    ],
  },
  {
    id: 'login-servidor',
    titulo: '2. Página de login del servidor (web)',
    pila: 'Navegador del sistema',
    estados: [
      ['Normal', body('<h1>Iniciar sesión</h1>', field('Correo electrónico', ''), field('Contraseña', ''), btn('Entrar'))],
      ['Error de credenciales', body('<h1>Iniciar sesión</h1>', banner('error', 'Correo o contraseña incorrectos'), field('Correo electrónico', 'ana@correo.com'), field('Contraseña', ''), btn('Entrar'))],
      ['Límite de intentos', body('<h1>Iniciar sesión</h1>', banner('warning', 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.'), btn('Entrar', 'primary', 'disabled'))],
    ],
  },
  {
    id: 'inicio',
    titulo: '3. Inicio / Tarjeta de emergencia',
    pila: '(app)',
    estados: [
      ['Normal', emergencia()],
      ['Sin conexión (desde la caché)', emergencia(banner('offline', 'Sin conexión. Mostrando tu última información guardada.'))],
      ['Datos vacíos', body(bar('Tarjeta de emergencia'), empty('Aún no hay datos', 'Agrega tu tipo de sangre, alergias y un contacto para tenerlos a la mano en una emergencia.'), btn('Completar mi tarjeta'), tabs('Inicio'))],
    ],
  },
  {
    id: 'listas',
    titulo: '4. Alergias, medicamentos y contactos',
    pila: '(app)',
    estados: [
      ['Lista', body(bar('Alergias'), card('Penicilina', 'Gravedad: grave'), card('Nueces', 'Gravedad: moderada'), btn('Agregar alergia'), tabs('Historial'))],
      ['Vacío', body(bar('Medicamentos'), empty('Sin medicamentos', 'Registra lo que tomas para recibir recordatorios.'), btn('Agregar medicamento'), tabs('Historial'))],
      ['Error de validación', body(bar('Nuevo contacto'), field('Nombre', '', 'El nombre es obligatorio'), field('Teléfono', '99912', 'Escribe un teléfono válido'), btn('Guardar'))],
      ['Sin sincronizar', body(bar('Contactos'), banner('warning', '2 cambios pendientes de sincronizar.', 'Sincronizar'), card('Ana Pérez', 'Madre · 999 123 4567'), tabs('Historial'))],
    ],
  },
  {
    id: 'receta',
    titulo: '5. Escanear receta',
    pila: '(app)',
    estados: [
      ['Vista previa', body(bar('Escanear receta'), '<div class="camera">Vista de la cámara</div>', btn('Tomar foto'))],
      ['Permiso denegado', body(bar('Escanear receta'), banner('warning', 'Necesitamos la cámara para escanear. Puedes subir la imagen manualmente.'), btn('Intentar de nuevo'), btn('Elegir de la galería', 'secondary'))],
      ['Permiso bloqueado', body(bar('Escanear receta'), banner('warning', 'El permiso de la cámara está bloqueado. Actívalo en los ajustes del teléfono.'), btn('Abrir ajustes'), btn('Elegir de la galería', 'secondary'))],
      ['Cargando', body(bar('Escanear receta'), loader('Subiendo la receta…'))],
    ],
  },
  {
    id: 'alertas',
    titulo: '6. Alertas',
    pila: '(app)',
    estados: [
      ['Con alertas', body(bar('Alertas'), banner('warning', 'Dosis sin confirmar: Clonazepam 0.5 mg.', 'Confirmar'), banner('info', 'Posible caída detectada. Avisaremos a tu contacto en 30 s.', 'Estoy bien'), card('Próximo recordatorio', 'Metformina · 20:00'), tabs('Alertas'))],
      ['Sin alertas', body(bar('Alertas'), empty('Todo en orden', 'No tienes alertas pendientes.'), tabs('Alertas'))],
    ],
  },
  {
    id: 'ubicacion',
    titulo: '7. Ubicación del incidente',
    pila: '(app)',
    estados: [
      ['Normal', body(bar('Ubicación del incidente'), card('Coordenadas', '20.9674, -89.5926', 'Precisión: 12 m'), btn('Enviar ubicación'))],
      ['GPS denegado', body(bar('Ubicación del incidente'), banner('warning', 'Sin permiso de ubicación: no se puede enviar tu ubicación. El resto de la app sigue funcionando.', 'Abrir ajustes'), btn('Enviar ubicación', 'primary', 'disabled'))],
    ],
  },
  {
    id: 'exportar',
    titulo: '8. Exportar',
    pila: '(app)',
    estados: [
      ['Normal', body(bar('Exportar historial'), btn('Exportar en JSON'), btn('Exportar en CSV', 'secondary'))],
      ['Cargando', body(bar('Exportar historial'), btn('Exportar en JSON', 'primary', 'loading'), btn('Exportar en CSV', 'secondary', 'disabled'))],
      ['Error', body(bar('Exportar historial'), banner('error', 'No se pudo exportar. Inténtalo de nuevo.', 'Reintentar'), btn('Exportar en JSON'), btn('Exportar en CSV', 'secondary'))],
    ],
  },
  {
    id: 'ajustes',
    titulo: '9. Ajustes',
    pila: '(app)',
    estados: [
      ['Normal', body(bar('Ajustes'), card('Permisos', 'Cámara: concedido', 'Ubicación: denegado'), btn('Cerrar sesión', 'danger'), tabs('Ajustes'))],
    ],
  },
  {
    id: 'despertando',
    titulo: '10. Servidor despertando',
    pila: '(app)',
    estados: [
      ['Conectando', body(loader('Conectando con el servidor…'), '<p class="lead center">El servidor puede tardar hasta un minuto en despertar.</p>')],
      ['Reintentando', body(loader('Reintentando (2 de 5)…'), banner('info', 'Seguimos intentando conectar.'))],
      ['Falló', body(banner('error', 'No pudimos conectar con el servidor.', 'Reintentar'), '<p class="lead center">Puedes consultar tu tarjeta de emergencia sin conexión.</p>', btn('Ver mi tarjeta de emergencia'))],
    ],
  },
];

const frame = (nombre, html) => `<figure class="phone"><figcaption>${esc(nombre)}</figcaption><div class="device">${html}</div></figure>`;

const flujo = `
<section id="flujo"><h2>Acceso a la tarjeta de emergencia: 3 toques o menos</h2>
<table><thead><tr><th>Situación</th><th>Pasos desde que se abre la app</th><th>Toques</th></tr></thead><tbody>
<tr><td>Con sesión guardada</td><td>La app abre en <strong>Inicio</strong>, que es la tarjeta de emergencia</td><td>0</td></tr>
<tr><td>Servidor dormido o sin conexión</td><td>Abrir app → «Ver mi tarjeta de emergencia» (desde «Servidor despertando» o el banner sin conexión) → tarjeta desde la caché</td><td>1</td></tr>
<tr><td>Sin sesión (primer uso del día)</td><td>«Iniciar sesión» (1) → escribir credenciales y «Entrar» en el navegador (2) → vuelve a la app, directo a la tarjeta</td><td>2</td></tr>
<tr><td>Desde cualquier pantalla de la app</td><td>Pestaña «Inicio» de la barra inferior</td><td>1</td></tr>
</tbody></table></section>`;

const css = `
:root{--bg:${c.background};--surface:${c.surface};--text:${c.text};--muted:${c.textMuted};--border:${c.border};--primary:${c.primary};--onprimary:${c.onPrimary};--danger:${c.danger};--ondanger:${c.onDanger};--dangersurf:${c.dangerSurface};--ondangersurf:${c.onDangerSurface};--warnsurf:${c.warningSurface};--onwarnsurf:${c.onWarningSurface};--infosurf:${c.infoSurface};--oninfosurf:${c.onInfoSurface};--disabled:${c.disabledSurface};--ondisabled:${c.onDisabled}}
*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;background:#e2e8f0;color:var(--text)}
main{max-width:1400px;margin:0 auto;padding:24px 16px}
h1.page{font-size:1.75rem}nav.index a{margin-right:12px}
section.pantalla{margin:32px 0}section.pantalla>h2{margin-bottom:4px}section.pantalla>p.pila{margin:0 0 12px;color:var(--muted)}
.row{display:flex;flex-wrap:wrap;gap:20px}
.phone{margin:0;width:300px}.phone figcaption{font-weight:600;margin-bottom:6px}
.device{height:600px;background:var(--bg);border:8px solid #0f172a;border-radius:28px;overflow:hidden;position:relative}
.screen{height:100%;padding:16px;display:flex;flex-direction:column;gap:12px;overflow:hidden}
.appbar h2{margin:0;font-size:22px}.screen h1{font-size:28px;line-height:36px;margin:24px 0 0}.screen h3{margin:0;font-size:16px}
.screen p{margin:0;font-size:16px;line-height:24px}.lead{color:var(--muted)}.center{text-align:center}
.btn{min-height:44px;width:100%;padding:8px 16px;font-size:16px;font-weight:600;border-radius:8px;border:1px solid var(--primary);display:flex;gap:8px;align-items:center;justify-content:center}
.btn.primary{background:var(--primary);color:var(--onprimary)}.btn.secondary{background:var(--bg);color:var(--primary)}
.btn.danger{background:var(--danger);color:var(--ondanger);border-color:var(--danger)}
.btn[disabled]{background:var(--disabled);color:var(--ondisabled);border-color:var(--disabled)}
.spin{width:16px;height:16px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;display:inline-block}.spin.big{width:32px;height:32px;color:var(--primary)}
.field label{display:block;font-weight:600;margin-bottom:4px}.input{min-height:44px;padding:10px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg)}
.input.err{border:2px solid var(--danger)}.fielderr{color:var(--danger);font-size:14px!important;margin-top:4px!important}
.banner{padding:12px;border-radius:8px;display:flex;flex-direction:column;gap:4px}
.banner.error{background:var(--dangersurf);color:var(--ondangersurf)}.banner.warning,.banner.offline{background:var(--warnsurf);color:var(--onwarnsurf)}.banner.info{background:var(--infosurf);color:var(--oninfosurf)}
.bannerbtn{min-height:44px;display:flex;align-items:center;font-weight:700}
.card{padding:16px;background:var(--surface);border-radius:12px;display:flex;flex-direction:column;gap:8px}
.loader{display:flex;flex-direction:column;align-items:center;gap:12px;padding:24px;color:var(--muted)}
.empty{padding:24px;text-align:center}.empty h3{font-size:18px}.empty p{color:var(--muted)}
.camera{flex:1;background:#0f172a;color:#fff;border-radius:12px;display:flex;align-items:center;justify-content:center}
.tabs{margin-top:auto;display:flex;border-top:1px solid var(--border)}.tabs span{flex:1;min-height:44px;display:flex;align-items:center;justify-content:center;font-size:14px;color:var(--muted)}.tabs .on{color:var(--primary);font-weight:700}
#flujo{background:var(--bg);padding:16px;border-radius:12px}table{border-collapse:collapse;width:100%}th,td{border:1px solid var(--border);padding:8px;text-align:left}
`;

const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>LifeSync · Mockups de pantallas</title><style>${css}</style></head>
<body><main>
<h1 class="page">LifeSync · Mockups de pantallas (PRD sección 13)</h1>
<p>Las 10 pantallas con sus estados. Colores y tamaños salen de los tokens de la app; consulta <code>docs/design/sistema-visual.md</code>.</p>
<nav class="index" aria-label="Índice">${screens.map((s) => `<a href="#${s.id}">${esc(s.titulo)}</a>`).join('')}<a href="#flujo">Acceso en 3 toques</a></nav>
${flujo}
${screens
  .map(
    (s) => `<section class="pantalla" id="${s.id}"><h2>${esc(s.titulo)}</h2><p class="pila">Pila: ${esc(s.pila)}</p><div class="row">${s.estados.map(([n, h]) => frame(n, h)).join('')}</div></section>`,
  )
  .join('\n')}
</main></body></html>
`;

writeFileSync(fileURLToPath(new URL('./mockups.html', import.meta.url)), html);
stdout.write(
  `mockups.html: ${screens.length} pantallas, ${screens.reduce((n, s) => n + s.estados.length, 0)} estados\n`,
);
