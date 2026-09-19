import { demoApi, isDemoMode } from "./demo";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

async function req(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  me: () => (isDemoMode() ? demoApi.me() : req("/../auth/me".replace("/api/../", "/"))),
  boards: () => (isDemoMode() ? demoApi.boards() : req("/boards")),
  createBoard: (name: string) =>
    isDemoMode()
      ? demoApi.createBoard(name)
      : req("/boards", { method: "POST", body: JSON.stringify({ name }) }),
  board: (id: string) => (isDemoMode() ? demoApi.board(id) : req(`/boards/${id}`)),
  createColumn: (boardId: string, name: string) =>
    isDemoMode()
      ? demoApi.createColumn(boardId, name)
      : req(`/boards/${boardId}/columns`, {
          method: "POST",
          body: JSON.stringify({ name }),
        }),
  createCard: (columnId: string, title: string, description?: string) =>
    isDemoMode()
      ? demoApi.createCard(columnId, title, description)
      : req(`/boards/columns/${columnId}/cards`, {
          method: "POST",
          body: JSON.stringify({ title, description }),
        }),
  moveCard: (cardId: string, toColumnId: string, toOrder: number) =>
    isDemoMode()
      ? demoApi.moveCard(cardId, toColumnId, toOrder)
      : req(`/boards/cards/${cardId}/move`, {
          method: "PATCH",
          body: JSON.stringify({ toColumnId, toOrder }),
        }),
  invite: (boardId: string, email: string) =>
    isDemoMode()
      ? demoApi.invite(boardId, email)
      : req(`/boards/${boardId}/invite`, {
          method: "POST",
          body: JSON.stringify({ email }),
        }),
};

export function authUrl(path: string) {
  const base = (import.meta.env.VITE_API_URL ?? "http://localhost:4000/api").replace(
    /\/api\/?$/,
    ""
  );
  return `${base}${path}`;
}
