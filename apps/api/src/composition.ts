import { prisma } from './lib/db/prisma.client.js';
import { verifyJwt } from './lib/jwt.js';
import { createAuthRepository } from './modules/auth/auth.repository.js';
import { createAuthService } from './modules/auth/auth.service.js';
import { createAuthMiddleware } from './modules/auth/auth.middleware.js';
import { createBusinessRepository } from './modules/business/business.repository.js';
import { createBusinessService } from './modules/business/business.service.js';
import { createBusinessController } from './modules/business/business.controller.js';
import { createBusinessRouter } from './modules/business/business.routes.js';
import { createOwnerRepository } from './modules/owner/owner.repository.js';
import { createOwnerService } from './modules/owner/owner.service.js';
import { createOwnerController } from './modules/owner/owner.controller.js';
import { createOwnerRoutes } from './modules/owner/owner.routes.js';
import { validateOwnerUpdate } from './modules/owner/owner.middleware.js';
import {
  createAuthorizeBusiness,
  validateBusinessInput,
  validateBusinessUpdateInput,
} from './modules/business/business.middleware.js';
import { createProductsRepository } from './modules/products/products.repository.js';
import { createProductsService } from './modules/products/products.service.js';
import { createProductsController } from './modules/products/products.controller.js';
import { createProductsRouter } from './modules/products/products.routes.js';
import { createUploadResolver } from './modules/products/products.middleware.js';
import { createUnitsRepository } from './modules/units/units.repository.js';
import { createUnitsService } from './modules/units/units.service.js';
import { createUnitsController } from './modules/units/units.controller.js';
import { createUnitsRouter } from './modules/units/units.routes.js';
import {
  createSupabaseClient,
  createSupabaseStorage,
  type StorageClient,
} from './lib/storage/storage.js';
import { AppError, ERROR_CODES } from './shared/errors/app-error.js';
import { createUploadsRepository } from './modules/uploads/uploads.repository.js';
import { createUploadsService } from './modules/uploads/uploads.service.js';
import { createUploadsController } from './modules/uploads/uploads.controller.js';
import { createUploadsRouter } from './modules/uploads/uploads.routes.js';
import type { Router } from 'express';

function buildStorage(): StorageClient {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const storageBucket = process.env.STORAGE_BUCKET;

  if (!supabaseUrl || !supabaseServiceRoleKey || !storageBucket) {
    return {
      async createUploadUrl() {
        throw new AppError(ERROR_CODES.INTERNAL_ERROR, 'Storage is not configured', 500);
      },
      async objectExists() {
        return false;
      },
      async createDownloadUrl() {
        throw new AppError(ERROR_CODES.INTERNAL_ERROR, 'Storage is not configured', 500);
      },
    };
  }

  return createSupabaseStorage(
    createSupabaseClient(supabaseUrl, supabaseServiceRoleKey),
    storageBucket,
  );
}

const storage = buildStorage();

const authRepository = createAuthRepository(prisma);
const authService = createAuthService(authRepository);
export const auth = createAuthMiddleware(verifyJwt, authService);

const businessRepository = createBusinessRepository(prisma);
const businessService = createBusinessService(businessRepository);
const businessController = createBusinessController(businessService);
export const businessRoutes = createBusinessRouter(
  businessController,
  validateBusinessInput,
  validateBusinessUpdateInput,
);

const ownerRepository = createOwnerRepository(prisma);
const ownerService = createOwnerService(ownerRepository);
const ownerController = createOwnerController(ownerService);
export const ownerRoutes = createOwnerRoutes(ownerController, validateOwnerUpdate);

const authorizeBusiness = createAuthorizeBusiness(businessService);

const productsRepository = createProductsRepository(prisma);
const productsService = createProductsService(productsRepository);
const productsController = createProductsController(productsService);

const uploadsRepository = createUploadsRepository(prisma);
const uploadsService = createUploadsService(uploadsRepository, storage);
const uploadsController = createUploadsController(uploadsService);
const resolveUploads = createUploadResolver(productsService);
const uploadsRouter: Router = createUploadsRouter(uploadsController, resolveUploads);

export const productsRoutes = createProductsRouter(
  productsController,
  authorizeBusiness,
  uploadsRouter,
);

const unitsRepository = createUnitsRepository(prisma);
const unitsService = createUnitsService(unitsRepository);
const unitsController = createUnitsController(unitsService);
export const unitsRoutes = createUnitsRouter(unitsController);
