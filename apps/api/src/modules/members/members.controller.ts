import type { Request, Response } from 'express';
import type { MemberListFilters } from '@mez/types';
import type { MembersService } from './members.types.js';
import type { Scope } from '../../shared/types/session.types.js';

export type MembersController = {
  listMembers(req: Request, res: Response): Promise<void>;
};

/** The business/branch the authorize middleware resolved onto the request. */
function scopeOf(req: Request): Scope {
  return {
    businessId: req.auth?.businessId as string,
    branchId: req.auth?.branchId as string,
  };
}

export function createMembersController(service: MembersService): MembersController {
  return {
    async listMembers(req, res) {
      const members = await service.list(scopeOf(req), req.validQuery as MemberListFilters);
      res.status(200).json(members);
    },
  };
}
