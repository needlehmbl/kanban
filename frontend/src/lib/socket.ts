import { io, Socket } from "socket.io-client";
import { getDemoSocket, isDemoMode } from "./demo";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (isDemoMode()) return getDemoSocket() as unknown as Socket;
  if (!socket) {
    const url =
      import.meta.env.VITE_API_URL?.replace("/api", "") ??
      "http://localhost:4000";
    // VITE_API_URL is like http://localhost:4000/api — socket lives at root
    const base = url.replace(/\/api\/?$/, "");
    socket = io(base, { withCredentials: true, autoConnect: true });
  }
  return socket;
}
