import { startHealthServer } from '@quant/health-server';

const port = Number(process.env['HEALTH_PORT'] ?? '3008');

void startHealthServer(port).then(() => {
  console.log(`neon-api health server listening on port ${port}`);
});
