# Reporte de Actividades — LM-18 Registro con contraseña protegida

## Actividad

Endpoint de registro con Argon2id (LM-40), pantalla de registro con validación local (LM-41) e integración con la API y manejo de errores (LM-42).

## Objetivo

Que el paciente cree una cuenta propia con su correo y una contraseña que nunca se guarda ni se registra en claro.

## Actividades realizadas

- Se creó `POST /auth/register` con validación estricta (correo, contraseña de 12 a 128 caracteres, sin campos extra ni tipos erróneos), correo normalizado y hash Argon2id con los parámetros del PRD; la respuesta nunca incluye el hash.
- Un correo repetido (también con otra capitalización) responde 409, resuelto con la restricción de unicidad de la base y no con una consulta previa.
- Se centralizó el hashing de contraseñas en un servicio único que usan el registro, el login OAuth y el seed.
- Se creó la pantalla de registro con un esquema Zod que aplica las mismas reglas que el servidor antes de enviar la petición, mensajes en español y el botón deshabilitado mientras la petición está en curso.
- Se integró la pantalla con la API mediante un caso de uso que traduce 201, 400, 409, errores de servidor y fallos de red a mensajes para el paciente, con aviso y reintento cuando no hay conexión o el servidor está dormido.
- Los errores del cliente HTTP pasan a la capa de aplicación para respetar la dirección de dependencias de la arquitectura.

## Criterios atendidos

- Con correo y contraseña válidos el sistema crea la cuenta y responde 201.
- Con un correo ya registrado responde 409 y la app muestra el mensaje correspondiente.
- Con un dato inválido o un campo extra responde 400, y la app ya lo validó localmente antes de enviar.
- La contraseña se guarda con Argon2id (`passwordHash` empieza con `$argon2id$`) y no aparece en ningún log.
- Los campos tienen etiquetas accesibles y objetivos táctiles de al menos 44 px.
- Un registro exitoso lleva a la pantalla de bienvenida para iniciar sesión.

## Resultado

El paciente puede registrarse desde la app con validación inmediata y mensajes claros, y el servidor almacena su contraseña de forma segura.

## Validación

- 79 pruebas unitarias del API (DTO, servicio con hash Argon2id y 409, entorno, OAuth) y 39 e2e contra PostgreSQL real: 201 sin hash, `$argon2id$` en la base, duplicado en otra capitalización, 400 por campos extra, tipos erróneos, inyección NoSQL y longitudes, y ausencia de la contraseña en la salida estándar.
- 77 pruebas de la app: esquema, caso de uso y pantalla (errores locales sin petición, doble envío, 201, 409, 400, sin red con reintento y error de servidor).
- Typecheck, lint y formato sin errores.

## Observaciones

El registro no tiene límite de intentos propio; el PRD lo exige solo para login y token. La pantalla de bienvenida de esta entrega es un ejemplo mínimo que enlaza al registro; LM-43 la construye completa.
