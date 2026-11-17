import { Slot } from 'expo-router';
import { SessionProvider } from '@/presentation/session/session-context';

export default function RootLayout() {
  return (
    <SessionProvider>
      <Slot />
    </SessionProvider>
  );
}
