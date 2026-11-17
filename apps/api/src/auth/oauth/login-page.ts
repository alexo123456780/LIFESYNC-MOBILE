import type { AuthorizeParams } from './authorize-request.js';
import { OAUTH_CLIENT_ID } from './authorize-request.js';

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** CSP restrictiva: el formulario solo puede enviarse al servidor y redirigir a los esquemas registrados. */
export function buildCsp(nonce: string, redirectUris: readonly string[]): string {
  const schemes = [...new Set(redirectUris.map((uri) => new URL(uri).protocol))];
  return [
    "default-src 'none'",
    `style-src 'nonce-${nonce}'`,
    `form-action 'self' ${schemes.join(' ')}`.trim(),
    "base-uri 'none'",
    "frame-ancestors 'none'",
  ].join('; ');
}

export interface LoginPageOptions {
  params: AuthorizeParams;
  csrfToken: string;
  nonce: string;
  error?: string;
}

/** Página de login del servidor de autorización: HTML mínimo, sin JavaScript. */
export function renderLoginPage({ params, csrfToken, nonce, error }: LoginPageOptions): string {
  const hidden = (name: string, value: string) =>
    `<input type="hidden" name="${name}" value="${escapeHtml(value)}">`;
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>LifeSync · Iniciar sesión</title>
<style nonce="${nonce}">
body{font-family:system-ui,sans-serif;margin:0;padding:24px;background:#f6f8fa;color:#111827}
main{max-width:420px;margin:0 auto}
h1{font-size:1.5rem}
label{display:block;margin-top:16px;font-weight:600}
input[type=email],input[type=password]{width:100%;box-sizing:border-box;min-height:48px;padding:12px;font-size:1rem;border:1px solid #6b7280;border-radius:8px}
button{width:100%;min-height:48px;margin-top:24px;font-size:1rem;font-weight:600;color:#fff;background:#1d4ed8;border:0;border-radius:8px}
.error{margin-top:16px;padding:12px;color:#7f1d1d;background:#fee2e2;border-radius:8px}
</style>
</head>
<body>
<main>
<h1>Iniciar sesión</h1>
${error ? `<p class="error" role="alert">${escapeHtml(error)}</p>` : ''}
<form method="post" action="">
${hidden('response_type', 'code')}
${hidden('client_id', OAUTH_CLIENT_ID)}
${hidden('redirect_uri', params.redirectUri)}
${hidden('code_challenge', params.codeChallenge)}
${hidden('code_challenge_method', 'S256')}
${hidden('state', params.state)}
${hidden('csrf', csrfToken)}
<label for="email">Correo electrónico</label>
<input id="email" name="email" type="email" autocomplete="username" maxlength="254" required>
<label for="password">Contraseña</label>
<input id="password" name="password" type="password" autocomplete="current-password" maxlength="128" required>
<button type="submit">Entrar</button>
</form>
</main>
</body>
</html>`;
}
