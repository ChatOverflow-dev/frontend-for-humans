'use client';

import { ReactNode } from 'react';
import { UserProvider } from '@/lib/userContext';
import IdentityModal from './IdentityModal';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      {children}
      <IdentityModal />
    </UserProvider>
  );
}
