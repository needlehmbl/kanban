import { Server, Socket } from "socket.io";

// Tracks which sockets are in which board room, for presence.
const boardPresence = new Map<string, Map<string, any>>();
// boardId -> socketId -> { id, name, avatarUrl }

declare global {
  // eslint-disable-next-line no-var
  var __kanbanIo: Server | undefined;
}

export function getIo() {
  return globalThis.__kanbanIo;
}

export function setIo(io: Server) {
  globalThis.__kanbanIo = io;
}

export function emitToBoard(boardId: string, event: string, payload: any) {
  getIo()?.to(`board:${boardId}`).emit(event, payload);
}

export function registerBoardSocket(io: Server) {
  setIo(io);
  io.on("connection", (socket: Socket) => {
    const user = (socket.request as any)?.user ?? (socket.handshake.auth as any);
    const profile = {
      id: (user as any)?.id ?? socket.handshake.auth?.userId ?? socket.id,
      name: (user as any)?.name ?? socket.handshake.auth?.name ?? "Anonymous",
      avatarUrl: (user as any)?.avatarUrl ?? socket.handshake.auth?.avatarUrl,
    };

    socket.on("board:join", (boardId: string) => {
      socket.join(`board:${boardId}`);
      if (!boardPresence.has(boardId)) boardPresence.set(boardId, new Map());
      boardPresence.get(boardId)!.set(socket.id, profile);
      io.to(`board:${boardId}`).emit(
        "presence:update",
        Array.from(boardPresence.get(boardId)!.values())
      );
    });

    socket.on("board:leave", (boardId: string) => {
      socket.leave(`board:${boardId}`);
      boardPresence.get(boardId)?.delete(socket.id);
      io.to(`board:${boardId}`).emit(
        "presence:update",
        Array.from(boardPresence.get(boardId)?.values() ?? [])
      );
    });

    socket.on("disconnecting", () => {
      for (const room of socket.rooms) {
        if (room.startsWith("board:")) {
          const boardId = room.slice("board:".length);
          boardPresence.get(boardId)?.delete(socket.id);
          io.to(room).emit(
            "presence:update",
            Array.from(boardPresence.get(boardId)?.values() ?? [])
          );
        }
      }
    });
  });
}
