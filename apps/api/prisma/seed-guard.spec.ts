import { assertSeedAllowed } from './seed-guard.js';

describe('assertSeedAllowed', () => {
  it('permite el seed en development', () => {
    expect(() => assertSeedAllowed({ NODE_ENV: 'development' })).not.toThrow();
  });

  it.each(['production', 'test', undefined])('rechaza el seed con NODE_ENV=%s', (nodeEnv) => {
    expect(() => assertSeedAllowed({ NODE_ENV: nodeEnv })).toThrow(
      /solo corre con NODE_ENV=development/,
    );
  });
});
