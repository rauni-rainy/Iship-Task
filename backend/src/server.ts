import http from 'http';
import app from './app';
import { testConnection } from './db/pool';
import { updateContestStatuses } from './services/contest.service';
import { initializeSocket } from './socket/socket.server';

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);
export const io = initializeSocket(server);

const startServer = async () => {
  try {
    // Test DB connection before starting the server
    await testConnection();

    // Initial status update and start interval
    await updateContestStatuses();
    setInterval(updateContestStatuses, 60_000);

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

process.on('unhandledRejection', (err: any) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message, err.stack);
  server.close(() => {
    process.exit(1);
  });
});
