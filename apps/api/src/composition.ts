import { prisma } from './lib/db/prisma.client.js';
import { verifyJwt } from './lib/jwt.js';
import { createAuthRepository } from './modules/auth/auth.repository.js';
import { createAuthService } from './modules/auth/auth.service.js';
import { createAuthMiddleware } from './modules/auth/auth.middleware.js';
import { createBusinessRepository } from './modules/business/business.repository.js';
import { createBusinessService } from './modules/business/business.service.js';
import { createBusinessController } from './modules/business/business.controller.js';
import { createBusinessRouter } from './modules/business/business.routes.js';
import {
  validateBusinessInput,
  createAuthorizeBusiness,
  requireBusinessRole,
} from './modules/business/business.middleware.js';
import { createBatchRepository } from './modules/batches/batches.repository.js';
import { createBatchService } from './modules/batches/batches.service.js';
import { createBatchController } from './modules/batches/batches.controller.js';
import { createBatchRouter } from './modules/batches/batches.routes.js';
import { validateBatchCreateInput } from './modules/batches/batches.middleware.js';
import { createProductRepository } from './modules/products/products.repository.js';
import { createProductService } from './modules/products/products.service.js';
import { createProductController } from './modules/products/products.controller.js';
import { createProductRouter } from './modules/products/products.routes.js';
import { createOwnerRepository } from './modules/owner/owner.repository.js';
import { createOwnerService } from './modules/owner/owner.service.js';
import { createOwnerController } from './modules/owner/owner.controller.js';
import { createOwnerRoutes } from './modules/owner/owner.routes.js';
import { validateOwnerUpdate } from './modules/owner/owner.middleware.js';

const authRepository = createAuthRepository(prisma);
const authService = createAuthService(authRepository);
export const auth = createAuthMiddleware(verifyJwt, authService);

const businessRepository = createBusinessRepository(prisma);
const businessService = createBusinessService(businessRepository);
const businessController = createBusinessController(businessService);
export const businessRoutes = createBusinessRouter(businessController, validateBusinessInput);

const batchRepository = createBatchRepository(prisma);
const batchService = createBatchService(batchRepository);
const batchController = createBatchController(batchService);
export const batchRoutes = createBatchRouter(
  batchController,
  createAuthorizeBusiness(businessService),
  requireBusinessRole(['OWNER', 'MANAGER']),
  validateBatchCreateInput,
);

const productRepository = createProductRepository(prisma);
const productService = createProductService(productRepository);
const productController = createProductController(productService);
export const productRoutes = createProductRouter(
  productController,
  createAuthorizeBusiness(businessService),
);

const ownerRepository = createOwnerRepository(prisma);
const ownerService = createOwnerService(ownerRepository);
const ownerController = createOwnerController(ownerService);
export const ownerRoutes = createOwnerRoutes(ownerController, validateOwnerUpdate);
