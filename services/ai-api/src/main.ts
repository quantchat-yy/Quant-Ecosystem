import { startHealthServer } from '@quant/health-server';

const port = Number(process.env['HEALTH_PORT'] ?? '3003');

void startHealthServer(port).then(() => {
  console.log(`ai-api health server listening on port ${port}`);
});
