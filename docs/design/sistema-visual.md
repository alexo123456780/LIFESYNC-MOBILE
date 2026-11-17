# Sistema visual de LifeSync

Fuente única de verdad en código: [`apps/mobile/src/presentation/theme`](../../apps/mobile/src/presentation/theme) (tokens) y [`apps/mobile/src/presentation/components`](../../apps/mobile/src/presentation/components) (componentes). Los componentes no escriben colores ni tamaños a mano: una prueba automática lo verifica. Los mockups de las pantallas están en [`mockups.html`](mockups.html).

Principios: en una emergencia la información se lee rápido (alto contraste, texto grande, pocas decisiones), todo es operable con el pulgar (objetivos de al menos 44 px) y nada depende solo del color.

## Colores

Texto normal exige contraste AA (4.5:1). Todas las combinaciones que usan los componentes están en `textPairs` y se comprueban en `theme.test.ts`.

| Texto                                     | Fondo                                 | Contraste |
| ----------------------------------------- | ------------------------------------- | --------- |
| `text` (#0F172A)                          | `background` (#FFFFFF)                | 17.85:1   |
| `text` (#0F172A)                          | `surface` (#F1F5F9)                   | 16.30:1   |
| `textMuted` (#475569)                     | `background` (#FFFFFF)                | 7.58:1    |
| `textMuted` (#475569)                     | `surface` (#F1F5F9)                   | 6.92:1    |
| `primary` (#1D4ED8)                       | `background` (#FFFFFF)                | 6.70:1    |
| `onPrimary` (#FFFFFF)                     | `primary` (#1D4ED8)                   | 6.70:1    |
| `danger` (#B91C1C)                        | `background` (#FFFFFF)                | 6.47:1    |
| `onDanger` (#FFFFFF)                      | `danger` (#B91C1C)                    | 6.47:1    |
| `onDangerSurface` (#7F1D1D)               | `dangerSurface` (#FEE2E2)             | 8.20:1    |
| `onWarningSurface` (#78350F)              | `warningSurface` (#FEF3C7)            | 8.15:1    |
| `onInfoSurface` (#1E3A8A)                 | `infoSurface` (#DBEAFE)               | 8.49:1    |
| `onDisabled` (#475569)                    | `disabledSurface` (#E2E8F0)           | 6.15:1    |

El borde de los campos (`border`, #64748B) tiene 4.76:1 contra el fondo, por encima del 3:1 que pide WCAG para componentes de interfaz. Los estados se distinguen además por texto e iconografía, no solo por color.

## Tipografía

Fuente del sistema. Los tamaños son «px lógicos» de React Native, que **escalan con el tamaño de texto del sistema**; los componentes limitan el crecimiento a `MAX_FONT_SCALE = 2` para que el diseño no se rompa, sin desactivar el escalado.

| Token       | Tamaño | Interlineado | Uso                          |
| ----------- | ------ | ------------ | ---------------------------- |
| `caption`   | 14     | 20           | Mensajes de error y ayudas   |
| `body`      | 16     | 24           | Texto base y etiquetas       |
| `bodyLarge` | 18     | 26           | Datos clave de la tarjeta    |
| `title`     | 22     | 30           | Títulos de pantalla          |
| `headline`  | 28     | 36           | Encabezado de bienvenida     |

Pesos: `regular` 400, `semibold` 600 (etiquetas y botones) y `bold` 700 (acciones en banners).

## Espaciado, forma y objetivos táctiles

- Espaciado: `xs` 4, `sm` 8, `md` 12, `lg` 16, `xl` 24, `xxl` 32.
- Radios: `md` 8 y `lg` 12. Bordes: `thin` 1 y `thick` 2 (estado de error).
- **Objetivo táctil mínimo: `MIN_TOUCH_TARGET` = 44 px** en alto y ancho de todo control interactivo.

## Componentes base

Todos viven en `presentation/components` y se importan desde `presentation/components`.

| Componente         | Para qué sirve                                                 | Accesibilidad                                                                                      |
| ------------------ | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `Button`           | Acción principal (`primary`), secundaria o destructiva (`danger`) | Rol `button`, `accessibilityLabel` (por defecto el texto), estados `disabled` y `busy`, mínimo 44 px |
| `TextField`        | Entrada de texto con etiqueta y mensaje de validación           | Etiqueta como `accessibilityLabel`, error como región viva y `accessibilityHint`, mínimo 44 px      |
| `Card`             | Agrupa datos relacionados (por ejemplo, la tarjeta de emergencia) | Opcionalmente un único elemento con `accessibilityLabel`                                           |
| `StatusBanner`     | Errores, avisos, información y sin conexión, con acción opcional | Los errores usan rol `alert` y región viva asertiva; la acción mide 44 px                          |
| `LoadingIndicator` | Espera de red o de operaciones largas                           | Rol `progressbar`, etiqueta anunciada y estado `busy`                                               |

### Estados

| Componente         | Normal                            | Deshabilitado                                  | Error                                       | Cargando                                          |
| ------------------ | --------------------------------- | ---------------------------------------------- | ------------------------------------------- | ------------------------------------------------- |
| `Button`           | Color de la variante              | Fondo `disabledSurface`, no responde al toque  | `danger` para acciones destructivas         | Indicador en el botón, no admite el doble toque   |
| `TextField`        | Borde `border`                    | No editable, fondo `disabledSurface`           | Borde grueso `danger` y mensaje debajo      | No aplica (la validación es local)                |
| `Card`             | Fondo `surface`                   | No aplica (no es interactiva)                  | No aplica                                   | No aplica                                         |
| `StatusBanner`     | `info`                            | No aplica                                      | `error` (alerta) y `offline` (aviso)        | No aplica                                         |
| `LoadingIndicator` | Indicador y texto                 | No aplica                                      | No aplica                                   | Es el propio estado de carga                      |

## Cómo se verifica

- `theme.test.ts`: contraste AA de todas las combinaciones, objetivo táctil de 44 px y escala tipográfica creciente.
- `components.test.tsx`: roles, etiquetas, objetivos de 44 px, cada estado, y que los componentes no contienen colores ni tamaños escritos a mano ni desactivan el escalado de texto.
- La página de login del servidor (`apps/api/src/auth/oauth/login-page.ts`) usa los mismos colores y el mismo botón de 48 px para que se vea como parte de la app.

## Pendiente

- Tema oscuro: hoy la app fuerza el modo claro (`userInterfaceStyle: light`).
- Pruebas con TalkBack y VoiceOver en dispositivo real (las pruebas actuales cubren las propiedades de accesibilidad, no el lector de pantalla).
