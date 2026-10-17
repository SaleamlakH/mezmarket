import { useContext } from 'react';
import { MembersContext } from './context';
import type { MembersService } from './types';

export function useMembersService(): MembersService {
  const context = useContext(MembersContext);

  if (!context) {
    throw new Error('useMembersService must be used within a MembersProvider');
  }

  return context;
}
