import { startHealthServer } from '@quant/health-server';

const port = Number(process.env['HEALTH_PORT'] ?? '3007');

void startHealthServer(port).then(() => {
  console.log(`max-api health server listening on port ${port}`);
});
