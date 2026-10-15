import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import type { MembersController } from './members.controller.js';

/** Reads are open to any member; the role filter is validated. */
export function createMembersRouter(
  controller: MembersController,
  authorizeBusiness: (req: Request, res: Response, next: NextFunction) => void,
  validateMemberListFilters: (req: Request, res: Response, next: NextFunction) => void,
): Router {
  const router = Router();

  router.get(
    '/businesses/:businessId/members',
    authorizeBusiness,
    validateMemberListFilters,
    controller.listMembers,
  );

  return router;
}
