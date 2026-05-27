import { startHealthServer } from '@quant/health-server';

const port = Number(process.env['HEALTH_PORT'] ?? '3005');

void startHealthServer(port).then(() => {
  console.log(`tube-api health server listening on port ${port}`);
});
