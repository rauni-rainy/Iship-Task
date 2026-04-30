import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';

let socketInstance: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socketInstance) {
    const token = Cookies.get('access_token');
    
    socketInstance = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: false
    });
  }
  
  if (!socketInstance.connected) {
    socketInstance.connect();
  }
  
  return socketInstance;
};

export const joinContest = (contestId: string) => {
  const socket = getSocket();
  socket.emit('join:contest', { contestId });
};

export const leaveContest = (contestId: string) => {
  const socket = getSocket();
  socket.emit('leave:contest', { contestId });
};

export const joinAdmin = (contestId: string) => {
  const socket = getSocket();
  socket.emit('join:admin', { contestId });
};

export const onLeaderboardUpdate = (cb: (data: any) => void) => {
  const socket = getSocket();
  socket.on('leaderboard:update', cb);
  socket.on('leaderboard:snapshot', cb);
  return () => {
    socket.off('leaderboard:update', cb);
    socket.off('leaderboard:snapshot', cb);
  };
};

export const onSubmissionJudged = (cb: (data: any) => void) => {
  const socket = getSocket();
  socket.on('submission:judged', cb);
  return () => {
    socket.off('submission:judged', cb);
  };
};

export const onContestStarted = (cb: (data: any) => void) => {
  const socket = getSocket();
  socket.on('contest:started', cb);
  return () => {
    socket.off('contest:started', cb);
  };
};

export const onContestEnded = (cb: (data: any) => void) => {
  const socket = getSocket();
  socket.on('contest:ended', cb);
  return () => {
    socket.off('contest:ended', cb);
  };
};

export const onInviteRegistered = (cb: (data: { username: string; contestId: string; registeredAt: string }) => void) => {
  const socket = getSocket();
  socket.on('invite:registered', cb);
  return () => {
    socket.off('invite:registered', cb);
  };
};

export const onJoinRequestNew = (cb: (data: any) => void) => {
  const socket = getSocket();
  socket.on('join_request:new', cb);
  return () => { socket.off('join_request:new', cb); };
};

export const onJoinRequestDecision = (cb: (data: { contestId: string; requestId: string; status: 'approved' | 'rejected'; message: string }) => void) => {
  const socket = getSocket();
  socket.on('join_request:decision', cb);
  return () => { socket.off('join_request:decision', cb); };
};


