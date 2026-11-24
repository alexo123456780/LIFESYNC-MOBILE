export function assertSeedAllowed(env: Record<string, string | undefined>): void {
  if (env.ALLOW_DEMO_SEED === 'true') {
    return;
  }
  if (env.NODE_ENV !== 'development') {
    throw new Error(
      `El seed solo corre con NODE_ENV=development o ALLOW_DEMO_SEED=true (actual: ${env.NODE_ENV ?? 'sin definir'})`,
    );
  }
}
