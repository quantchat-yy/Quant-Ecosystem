import { startHealthServer } from '@quant/health-server';

const port = Number(process.env['HEALTH_PORT'] ?? '3002');

void startHealthServer(port).then(() => {
  console.log(`chat-api health server listening on port ${port}`);
});
