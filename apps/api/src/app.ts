import 'dotenv/config';
import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import { auth, businessRoutes } from './composition.js';
import { errorHandler } from './shared/errors/error-handler.js';

const app: Express = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGINS?.split(',') ?? [],
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
  }),
);

app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
  res.sendStatus(200);
});

// protect all api endpoints
app.use('/api', auth);
app.use('/api', businessRoutes);

app.use(errorHandler);

export default app;
