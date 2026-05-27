import { startHealthServer } from '@quant/health-server';

const port = Number(process.env['HEALTH_PORT'] ?? '3033');

void startHealthServer(port).then(() => {
  console.log(`edits-api health server listening on port ${port}`);
});
