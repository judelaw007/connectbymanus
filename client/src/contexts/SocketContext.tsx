import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import Cookies from "js-cookie";
import { COOKIE_NAME } from "@shared/const";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: number[];
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  onlineUsers: [],
});

export function useSocket() {
  return useContext(SocketContext);
}

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<number[]>([]);

  useEffect(() => {
    // Get auth token from cookie
    const token = Cookies.get(COOKIE_NAME);
    if (!token) {
      console.log("[Socket] No auth token, skipping connection");
      return;
    }

    // Connect to Socket.io server
    const socketInstance = io({
      auth: { token },
      autoConnect: true,
    });

    socketInstance.on("connect", () => {
      console.log("[Socket] Connected");
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      console.log("[Socket] Disconnected");
      setIsConnected(false);
    });

    socketInstance.on("user:online", ({ userId }: { userId: number }) => {
      setOnlineUsers(prev => {
        if (prev.includes(userId)) return prev;
        return [...prev, userId];
      });
    });

    socketInstance.on("user:offline", ({ userId }: { userId: number }) => {
      setOnlineUsers(prev => prev.filter(id => id !== userId));
    });

    socketInstance.on("error", (error: { message: string }) => {
      console.error("[Socket] Error:", error.message);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
}
