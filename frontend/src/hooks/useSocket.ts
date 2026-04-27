import { useState, useEffect } from 'react';
import { getSocket, joinContest, leaveContest } from '@/lib/socket';

export const useSocket = (contestId?: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    if (!contestId) return;

    const socket = getSocket();

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    setIsConnected(socket.connected);
    joinContest(contestId);

    return () => {
      leaveContest(contestId);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [contestId]);

  return { isConnected, onlineCount };
};
