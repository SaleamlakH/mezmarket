import { Prisma } from '../../../../generated/prisma/client.js';
import type { BusinessMemberRole } from '@mez/types';
import type { DashboardActor } from '../dashboard.types.js';

/** A real Prisma decimal, so the service's decimal arithmetic runs for real. */
export function money(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

export function actor(role: BusinessMemberRole = 'OWNER'): DashboardActor {
  return { businessId: 'b-1', branchId: 'br-1', memberId: 'm-1', role };
}
