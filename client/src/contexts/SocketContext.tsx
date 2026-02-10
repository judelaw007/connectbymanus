import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import Cookies from "js-cookie";
import { COOKIE_NAME } from "@shared/const";

export interface OnlineUser {
  userId: number;
  name: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: OnlineUser[];
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
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    // Try to read token from cookie (works for non-httpOnly cookies).
    // For httpOnly cookies, the browser sends them automatically via
    // withCredentials, and the server parses them from the handshake headers.
    const token = Cookies.get(COOKIE_NAME);

    // Connect to Socket.io server — always connect so httpOnly cookies work
    const socketInstance = io({
      auth: token ? { token } : {},
      withCredentials: true,
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

    // Receive full list of currently online users on connect
    socketInstance.on("users:online-list", (users: OnlineUser[]) => {
      setOnlineUsers(users);
    });

    socketInstance.on(
      "user:online",
      ({ userId, name }: { userId: number; name: string }) => {
        setOnlineUsers(prev => {
          if (prev.some(u => u.userId === userId)) return prev;
          return [...prev, { userId, name }];
        });
      }
    );

    socketInstance.on("user:offline", ({ userId }: { userId: number }) => {
      setOnlineUsers(prev => prev.filter(u => u.userId !== userId));
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
