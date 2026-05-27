import { startHealthServer } from '@quant/health-server';

const port = Number(process.env['HEALTH_PORT'] ?? '3001');

void startHealthServer(port).then(() => {
  console.log(`mail-api health server listening on port ${port}`);
});
