import express from 'express';
import { config } from './config';
import { logger } from './logger';
import { requireAuth } from './middleware/auth';
import { errorHandler } from './middleware/errors';
import { ordersRouter } from './routes/orders';
import { refundsRouter } from './routes/refunds';
import { walletRouter } from './routes/wallet';

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(refundsRouter);
app.use('/orders', requireAuth, ordersRouter);
app.use('/wallet', requireAuth, walletRouter);

app.use(errorHandler);

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'unhandled promise rejection');
});

app.listen(config.port, () => {
  logger.info({ port: config.port }, 'larkspur-checkout listening');
});
