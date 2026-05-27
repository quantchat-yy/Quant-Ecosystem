import { startHealthServer } from '@quant/health-server';

const port = Number(process.env['HEALTH_PORT'] ?? '3038');

void startHealthServer(port).then(() => {
  console.log(`sync-api health server listening on port ${port}`);
});
