import escapeHtml from 'escape-html';
import { buildCsp, renderLoginPage } from './login-page.js';

const params = {
  redirectUri: 'lifesync://oauth/callback',
  codeChallenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
  state: 'abc',
};

describe('página de login', () => {
  it('escapa HTML en todos los valores', () => {
    expect(escapeHtml(`<script>"'&`)).toBe('&lt;script&gt;&quot;&#39;&amp;');
  });

  it('no permite inyectar marcado por el state ni por el mensaje de error', () => {
    const html = renderLoginPage({
      params: { ...params, state: '"><script>alert(1)</script>' },
      csrfToken: 'tok',
      nonce: 'n',
      error: '<img src=x onerror=alert(1)>',
    });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('incluye los parámetros PKCE, el token CSRF y el nonce del estilo', () => {
    const html = renderLoginPage({ params, csrfToken: 'token-csrf', nonce: 'nonce1' });
    expect(html).toContain(
      'name="code_challenge" value="E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"',
    );
    expect(html).toContain('name="csrf" value="token-csrf"');
    expect(html).toContain('<style nonce="nonce1">');
    expect(html).not.toContain('role="alert"');
  });

  it('la CSP permite enviar el formulario solo al servidor y a los esquemas registrados', () => {
    const csp = buildCsp('n1', ['lifesync://oauth/callback', 'exp://10.0.0.1:8081/--/cb']);
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("style-src 'nonce-n1'");
    expect(csp).toContain("form-action 'self' lifesync: exp:");
    expect(csp).toContain("frame-ancestors 'none'");
  });
});
