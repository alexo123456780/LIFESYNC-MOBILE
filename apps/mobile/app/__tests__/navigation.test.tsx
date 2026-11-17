import { act, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Slot, router } from 'expo-router';
import { Text } from 'react-native';
import type { TokenStorage } from '@/application/token-storage';
import { SessionProvider, useSession } from '@/presentation/session/session-context';
import AppLayout from '../(app)/_layout';
import AuthLayout from '../(auth)/_layout';

const tokens = { accessToken: 'access', refreshToken: 'refresh' };

const makeStorage = (initial: typeof tokens | null): TokenStorage => {
  let saved = initial;
  return {
    save: async (next) => void (saved = next),
    load: async () => saved,
    clear: async () => void (saved = null),
  };
};

let session!: ReturnType<typeof useSession>;
const Probe = () => {
  session = useSession();
  return null;
};

/** Árbol real de rutas: layouts reales de (auth) y (app), sesión real, almacén y API falsos. */
const renderApp = async (initialTokens: typeof tokens | null, initialUrl: string) =>
  await renderRouter(
    {
      _layout: () => (
        <SessionProvider
          storage={makeStorage(initialTokens)}
          api={{ post: async () => undefined as never }}
          clearCache={async () => {}}
        >
          <Probe />
          <Slot />
        </SessionProvider>
      ),
      '(auth)/_layout': AuthLayout,
      '(auth)/welcome': () => <Text>pantalla-bienvenida</Text>,
      '(app)/_layout': AppLayout,
      '(app)/index': () => <Text>pantalla-inicio</Text>,
      '(app)/settings': () => <Text>pantalla-ajustes</Text>,
    },
    { initialUrl },
  );

describe('navegación según la sesión', () => {
  it('sin sesión, abrir una ruta de (app) lleva a la bienvenida de (auth)', async () => {
    await renderApp(null, '/settings');
    expect(await screen.findByText('pantalla-bienvenida')).toBeOnTheScreen();
    expect(screen.queryByText('pantalla-ajustes')).toBeNull();
  });

  it('con sesión guardada la app abre (app) directo, sin mostrar (auth)', async () => {
    await renderApp(tokens, '/');
    expect(await screen.findByText('pantalla-inicio')).toBeOnTheScreen();
    expect(screen.queryByText('pantalla-bienvenida')).toBeNull();
  });

  it('con sesión, abrir la bienvenida redirige a (app)', async () => {
    await renderApp(tokens, '/welcome');
    expect(await screen.findByText('pantalla-inicio')).toBeOnTheScreen();
  });

  it('tras cerrar sesión se muestra la bienvenida y «atrás» no regresa a (app)', async () => {
    await renderApp(tokens, '/');
    await screen.findByText('pantalla-inicio');
    await act(async () => router.push('/settings'));
    expect(await screen.findByText('pantalla-ajustes')).toBeOnTheScreen();

    await act(async () => {
      await session.signOut();
    });
    expect(await screen.findByText('pantalla-bienvenida')).toBeOnTheScreen();

    await act(async () => {
      if (router.canGoBack()) router.back();
    });
    await waitFor(() => expect(screen.getByText('pantalla-bienvenida')).toBeOnTheScreen());
    expect(screen.queryByText('pantalla-ajustes')).toBeNull();
    expect(screen.queryByText('pantalla-inicio')).toBeNull();
    expect(router.canGoBack()).toBe(false);
  });
});
