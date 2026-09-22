import type { Request, Response } from 'express';
import type { CreateUploadInput, UploadService } from './uploads.types.js';

export type UploadController = {
  createUpload(req: Request, res: Response): Promise<void>;
  getUploadUrl(req: Request, res: Response): Promise<void>;
  getUploadUrls(req: Request, res: Response): Promise<void>;
};

export function createUploadsController(service: UploadService): UploadController {
  return {
    async createUpload(req: Request, res: Response) {
      const result = await service.createUpload(req.validBody as CreateUploadInput);
      res.status(201).json(result);
    },

    async getUploadUrl(req: Request, res: Response) {
      const uploadId = req.params.uploadId;
      const result = await service.getUploadUrl(Array.isArray(uploadId) ? uploadId[0] : uploadId);
      res.status(200).json(result);
    },

    async getUploadUrls(req: Request, res: Response) {
      const result = await service.getUploadUrls(req.uploadIds);
      res.status(200).json(result);
    },
  };
}
