import { Router, type NextFunction, type Request, type Response } from 'express';
import type { UploadController } from './uploads.controller.js';

export function createUploadsRouter(
  controller: UploadController,
  resolveUploads: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): Router {
  const router = Router();

  router.post('/uploads', resolveUploads, controller.createUpload);
  router.get('/uploads/urls', resolveUploads, controller.getUploadUrls);
  router.get('/:recordId/uploads/:uploadId/url', resolveUploads, controller.getUploadUrl);

  return router;
}
