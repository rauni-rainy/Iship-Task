import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyAccessToken } from '../utils/jwt.util';
import pool from '../db/pool';
import cookie from 'cookie';

export let io: Server;

export const initializeSocket = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  io.use((socket, next) => {
    try {
      let token = socket.handshake.auth?.token;
      
      // Fallback to cookie
      if (!token && socket.handshake.headers.cookie) {
        const parsedCookies = cookie.parse(socket.handshake.headers.cookie);
        token = parsedCookies.access_token;
      }

      if (!token) {
        return next(new Error('Unauthorized'));
      }

      const decoded = verifyAccessToken(token) as { userId: string; role: string };
      socket.data.user = { id: decoded.userId, role: decoded.role };
      next();
    } catch (error) {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;

    socket.on('join:contest', async ({ contestId }) => {
      try {
        const regRes = await pool.query('SELECT 1 FROM registrations WHERE user_id = $1 AND contest_id = $2', [user.id, contestId]);
        if (regRes.rows.length === 0 && user.role !== 'admin') {
          const contestRes = await pool.query('SELECT created_by FROM contests WHERE id = $1', [contestId]);
          if (contestRes.rows.length === 0 || contestRes.rows[0].created_by !== user.id) {
            socket.emit('error', 'Not registered for this contest');
            return;
          }
        }

        const room = `contest:${contestId}`;
        socket.join(room);
        socket.join(`user:${user.id}`);
        
        socket.emit('contest:joined', { contestId });

        const submissionService = require('../services/submission.service');
        const lb = await submissionService.getLeaderboard(contestId);
        socket.emit('leaderboard:snapshot', lb);

        io.to(`admin:contest:${contestId}`).emit('admin:user_joined', {
          userId: user.id,
          timestamp: new Date()
        });

      } catch (err) {
        console.error('Error joining contest:', err);
      }
    });

    socket.on('join:admin', async ({ contestId }) => {
      try {
        if (user.role !== 'admin') {
          const contestRes = await pool.query('SELECT created_by FROM contests WHERE id = $1', [contestId]);
          if (contestRes.rows.length === 0 || contestRes.rows[0].created_by !== user.id) {
            socket.emit('error', 'Unauthorized for admin room');
            return;
          }
        }

        socket.join(`admin:contest:${contestId}`);
        socket.emit('admin:snapshot', { timestamp: new Date() });
      } catch (err) {
        console.error('Error joining admin:', err);
      }
    });

    socket.on('leave:contest', ({ contestId }) => {
      socket.leave(`contest:${contestId}`);
      io.to(`admin:contest:${contestId}`).emit('admin:user_left', {
        userId: user.id,
        timestamp: new Date()
      });
    });

    socket.on('ping:alive', () => {});
    
    socket.on('disconnecting', () => {
      for (const room of socket.rooms) {
        if (room.startsWith('contest:')) {
          const contestId = room.split(':')[1];
          io.to(`admin:contest:${contestId}`).emit('admin:user_left', {
            userId: user.id,
            timestamp: new Date()
          });
        }
      }
    });
  });

  return io;
};
