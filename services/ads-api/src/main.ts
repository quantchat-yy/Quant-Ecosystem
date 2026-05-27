import { startHealthServer } from '@quant/health-server';

const port = Number(process.env['HEALTH_PORT'] ?? '3006');

void startHealthServer(port).then(() => {
  console.log(`ads-api health server listening on port ${port}`);
});
