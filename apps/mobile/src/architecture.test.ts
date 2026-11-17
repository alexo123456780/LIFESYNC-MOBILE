import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = join(__dirname, '..');
const sources = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === 'node_modules') return [];
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
const files = [...sources(join(root, 'src')), ...sources(join(root, 'app'))].map(
  (path) => [relative(root, path), readFileSync(path, 'utf8')] as const,
);

describe('reglas de arquitectura y de seguridad de la sesión', () => {
  it('AsyncStorage solo se usa en la caché local (los tokens nunca van ahí)', () => {
    const users = files
      .filter(([, source]) => source.includes('async-storage'))
      .map(([file]) => file);
    expect(users).toEqual(['src/infrastructure/cache/local-cache.ts']);
  });

  it('SecureStore solo se usa en el almacén de tokens', () => {
    const users = files
      .filter(([, source]) => source.includes('expo-secure-store'))
      .map(([file]) => file);
    expect(users).toEqual(['src/infrastructure/secure-store/token-storage.ts']);
  });

  it.each(files)('%s no escribe en los logs', (_file, source) => {
    expect(source).not.toMatch(/\bconsole\.(log|info|debug|warn|error)\b/);
  });

  it('el dominio no importa Expo, React ni React Native', () => {
    for (const [file, source] of files.filter(([file]) => file.startsWith('src/domain/'))) {
      expect({ file, imports: source.match(/from '(expo|react|react-native)[^']*'/g) }).toEqual({
        file,
        imports: null,
      });
    }
  });

  it('la capa de aplicación no importa infraestructura ni presentación', () => {
    for (const [file, source] of files.filter(([file]) => file.startsWith('src/application/'))) {
      expect({
        file,
        bad: source.match(/from '(\.\.\/)+(infrastructure|presentation)[^']*'/g),
      }).toEqual({
        file,
        bad: null,
      });
    }
  });
});
