import 'dotenv/config';
import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import { errorHandler } from './shared/errors/error-handler.js';
import {
  auth,
  businessRoutes,
  ownerRoutes,
  productsRoutes,
  unitsRoutes,
  batchRoutes,
  salesRoutes,
  customersRoutes,
  membersRoutes,
} from './composition.js';

const app: Express = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGINS?.split(',') ?? [],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  }),
);

app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
  res.sendStatus(200);
});

// platform standard units and their dimension
app.use('/api', unitsRoutes);

// protect all api endpoints
app.use('/api', auth);
app.use('/api', businessRoutes);
app.use('/api', batchRoutes);

app.use('/api', businessRoutes);
app.use('/api', ownerRoutes);
app.use('/api', productsRoutes);
app.use('/api', salesRoutes);
app.use('/api', customersRoutes);
app.use('/api', membersRoutes);

app.use(errorHandler);

export default app;
