import { app } from './app';
import { config } from './config';

const server = app.listen(config.port, () => {
  console.log(`Money Tracker API running on http://localhost:${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
});

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${config.port} is already in use. Please stop the other process and retry.`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
