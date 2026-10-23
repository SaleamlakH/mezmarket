import type { Request, Response } from 'express';
import type {
  BusinessMemberRole,
  MemberListFilters,
  ReportingPeriodQueryFilters,
} from '@mez/types';
import type { MembersService } from './members.types.js';

export type MembersController = {
  listMembers(req: Request, res: Response): Promise<void>;
  getMemberPerformance(req: Request, res: Response): Promise<void>;
};

export function createMembersController(service: MembersService): MembersController {
  return {
    async listMembers(req, res) {
      const members = await service.list(
        { businessId: req.auth?.businessId as string, branchId: req.auth?.branchId as string },
        req.validQuery as MemberListFilters,
      );
      res.status(200).json(members);
    },

    async getMemberPerformance(req, res) {
      const memberId = req.params.memberId as string;
      const period = req.validQuery as ReportingPeriodQueryFilters;
      const performance = await service.getPerformance(
        {
          businessId: req.auth?.businessId as string,
          branchId: req.auth?.branchId as string,
          memberId: req.auth?.memberId as string,
          role: req.auth?.role as BusinessMemberRole,
        },
        memberId,
        period,
      );
      res.status(200).json(performance);
    },
  };
}
