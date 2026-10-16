import { createContext } from 'react';
import type { MembersService } from './types';

export const MembersContext = createContext<MembersService | null>(null);
