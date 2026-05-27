import { startHealthServer } from '@quant/health-server';

const port = Number(process.env['HEALTH_PORT'] ?? '3040');

void startHealthServer(port).then(() => {
  console.log(`ws-gateway health server listening on port ${port}`);
});
