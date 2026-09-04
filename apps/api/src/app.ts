import 'dotenv/config';
import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import { prisma } from './lib/db/prisma.client.js';
import { verifyJwt } from './lib/jwt.js';
import { createAuthRepository } from './modules/auth/auth.repository.js';
import { createAuthService } from './modules/auth/auth.service.js';
import { createAuthMiddleware } from './modules/auth/auth.middleware.js';
import { errorHandler } from './shared/errors/error-handler.js';

const authRepository = createAuthRepository(prisma);
const authService = createAuthService(authRepository);
const auth = createAuthMiddleware(verifyJwt, authService);

const app: Express = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGINS.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
  }),
);

app.get('/health', (req: Request, res: Response) => {
  res.sendStatus(200);
});

// protect all api endpoints
app.use('/api', auth);

app.use(errorHandler);

export default app;
