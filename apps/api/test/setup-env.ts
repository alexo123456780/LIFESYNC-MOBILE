import { generateKeyPairSync } from 'node:crypto';

// Valores por defecto de las pruebas e2e: llaves ES256 efímeras y URIs de redirección de prueba.
// DATABASE_URL debe venir del entorno (base con migraciones aplicadas).
if (!process.env.JWT_PRIVATE_KEY_B64 || !process.env.JWT_PUBLIC_KEY_B64) {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const b64 = (pem: string | Buffer) => Buffer.from(pem).toString('base64');
  process.env.JWT_PRIVATE_KEY_B64 = b64(privateKey.export({ type: 'pkcs8', format: 'pem' }));
  process.env.JWT_PUBLIC_KEY_B64 = b64(publicKey.export({ type: 'spki', format: 'pem' }));
}
process.env.OAUTH_REDIRECT_URIS ??= 'lifesync://oauth/callback';
