import 'dotenv/config';
import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';

const app: Express = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGINS.split(','),
    credentials: true,
  }),
);

app.get('/health', (req: Request, res: Response) => {
  res.sendStatus(200);
});

export default app;
