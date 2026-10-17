import { MembersContext } from './context';
import type { MembersProviderProps } from './types';

export function MembersProvider({ membersService, children }: MembersProviderProps) {
  return <MembersContext value={membersService}>{children}</MembersContext>;
}
