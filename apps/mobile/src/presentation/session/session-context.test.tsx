import { act, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import type { TokenStorage } from '@/application/token-storage';
import { SessionProvider, useSession } from './session-context';

const tokens = { accessToken: 'access', refreshToken: 'refresh' };

let session!: ReturnType<typeof useSession>;
function Probe() {
  session = useSession();
  return <Text>{session.status}</Text>;
}

const makeStorage = (initial: typeof tokens | null) => {
  let saved = initial;
  const storage: TokenStorage = {
    save: async (next) => void (saved = next),
    load: async () => saved,
    clear: async () => void (saved = null),
  };
  return { storage, saved: () => saved };
};
const renderSession = (
  storage: TokenStorage,
  api = { post: jest.fn().mockResolvedValue(undefined) },
) =>
  render(
    <SessionProvider
      storage={storage}
      api={api}
      clearCache={jest.fn().mockResolvedValue(undefined)}
    >
      <Probe />
    </SessionProvider>,
  );

describe('SessionProvider', () => {
  it('mientras lee el almacén seguro está en «loading» (sin parpadeo entre pilas)', async () => {
    let finish!: (value: typeof tokens) => void;
    const { storage } = makeStorage(null);
    storage.load = () => new Promise((resolve) => (finish = resolve));
    await renderSession(storage);

    expect(screen.getByText('loading')).toBeOnTheScreen();
    await act(async () => finish(tokens));
    expect(screen.getByText('authenticated')).toBeOnTheScreen();
  });

  it('restaura la sesión guardada sin pedir login', async () => {
    await renderSession(makeStorage(tokens).storage);
    await waitFor(() => expect(screen.getByText('authenticated')).toBeOnTheScreen());
    expect(session.tokens).toEqual(tokens);
  });

  it('sin tokens guardados queda sin sesión (se abre la pila de autenticación)', async () => {
    await renderSession(makeStorage(null).storage);
    await waitFor(() => expect(screen.getByText('unauthenticated')).toBeOnTheScreen());
    expect(session.tokens).toBeNull();
  });

  it('signIn guarda los tokens en el almacén seguro y abre la sesión', async () => {
    const { storage, saved } = makeStorage(null);
    await renderSession(storage);
    await waitFor(() => expect(screen.getByText('unauthenticated')).toBeOnTheScreen());

    await act(async () => {
      await session.signIn(tokens);
    });

    expect(saved()).toEqual(tokens);
    expect(screen.getByText('authenticated')).toBeOnTheScreen();
  });

  it('si no se pueden guardar los tokens, signIn falla y no abre la sesión', async () => {
    const { storage } = makeStorage(null);
    storage.save = async () => {
      throw new Error('keystore lleno');
    };
    await renderSession(storage);
    await waitFor(() => expect(screen.getByText('unauthenticated')).toBeOnTheScreen());

    await act(async () => {
      await expect(session.signIn(tokens)).rejects.toThrow('keystore lleno');
    });
    expect(screen.getByText('unauthenticated')).toBeOnTheScreen();
  });

  it('signOut revoca en el servidor, borra el almacén y vuelve a «unauthenticated»', async () => {
    const { storage, saved } = makeStorage(tokens);
    const api = { post: jest.fn().mockResolvedValue(undefined) };
    await renderSession(storage, api);
    await waitFor(() => expect(screen.getByText('authenticated')).toBeOnTheScreen());

    let result;
    await act(async () => {
      result = await session.signOut();
    });

    expect(result).toEqual({ serverRevoked: true, localCleared: true });
    expect(api.post).toHaveBeenCalledWith(
      '/auth/logout',
      { refresh_token: 'refresh' },
      { headers: { Authorization: 'Bearer access' } },
    );
    expect(saved()).toBeNull();
    expect(screen.getByText('unauthenticated')).toBeOnTheScreen();
  });

  it('signOut sin red cierra la sesión local igualmente', async () => {
    const { storage, saved } = makeStorage(tokens);
    await renderSession(storage, { post: jest.fn().mockRejectedValue(new Error('sin red')) });
    await waitFor(() => expect(screen.getByText('authenticated')).toBeOnTheScreen());

    await act(async () => {
      await session.signOut();
    });

    expect(saved()).toBeNull();
    expect(screen.getByText('unauthenticated')).toBeOnTheScreen();
  });
});
