import { startHealthServer } from '@quant/health-server';

const port = Number(process.env['HEALTH_PORT'] ?? '3004');

void startHealthServer(port).then(() => {
  console.log(`sync-api health server listening on port ${port}`);
});
