import { render, screen } from '@testing-library/react-native';
import AppLayout from '../(app)/_layout';
import AuthLayout from '../(auth)/_layout';

let mockStatus = 'loading';
jest.mock('expo-router', () => {
  const { Text: RNText } = jest.requireActual('react-native');
  return {
    Redirect: ({ href }: { href: string }) => <RNText>{`redirect:${href}`}</RNText>,
    Stack: () => <RNText>stack</RNText>,
  };
});
jest.mock('@/presentation/session/session-context', () => ({
  useSession: () => ({ status: mockStatus }),
}));

const layouts = [
  ['(app)', AppLayout, 'authenticated', '/welcome'],
  ['(auth)', AuthLayout, 'unauthenticated', '/'],
] as const;

describe.each(layouts)('guard de la pila %s', (_group, Layout, allowed, redirectHref) => {
  it('mientras se restaura la sesión muestra la carga: sin parpadeo ni redirección', async () => {
    mockStatus = 'loading';
    await render(<Layout />);
    expect(screen.getByRole('progressbar')).toBeOnTheScreen();
    expect(screen.queryByText(/^redirect:/)).toBeNull();
    expect(screen.queryByText('stack')).toBeNull();
  });

  it('con el estado correcto muestra la pila', async () => {
    mockStatus = allowed;
    await render(<Layout />);
    expect(screen.getByText('stack')).toBeOnTheScreen();
  });

  it('con el estado contrario redirige (replace: «atrás» no regresa)', async () => {
    mockStatus = allowed === 'authenticated' ? 'unauthenticated' : 'authenticated';
    await render(<Layout />);
    expect(screen.getByText(`redirect:${redirectHref}`)).toBeOnTheScreen();
  });
});
