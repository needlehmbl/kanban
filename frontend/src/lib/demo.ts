// Hybrid showcase: zero-backend demo mode for GitHub Pages visitors.
// Active when `?demo=1` is in the URL or VITE_DEMO_MODE=true at build time.
// No OAuth, no API, no Postgres — seeded board in localStorage + simulated
// collaborator events on the same channel names the real Board page uses.

export function isDemoMode(): boolean {
  if (import.meta.env.VITE_DEMO_MODE === "true") return true;
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("demo") === "1";
}

/** Append ?demo=1 to an internal link when demo mode is active. */
export function withDemo(path: string): string {
  if (!isDemoMode()) return path;
  if (path.includes("demo=1")) return path;
  return path.includes("?") ? `${path}&demo=1` : `${path}?demo=1`;
}

type DemoCard = {
  id: string;
  columnId: string;
  title: string;
  description?: string;
  order: number;
};
type DemoColumn = { id: string; boardId: string; name: string; order: number; cards: DemoCard[] };
type DemoBoard = { id: string; name: string; columns: DemoColumn[] };

const KEY = "kanban-demo-v1";
const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;

function seed(): { boards: DemoBoard[] } {
  const boardId = "demo-board-1";
  const cols: DemoColumn[] = [
    {
      id: "demo-col-todo",
      boardId,
      name: "To do",
      order: 0,
      cards: [
        { id: "demo-card-1", columnId: "demo-col-todo", title: "Design landing hero", description: "Portfolio-style showcase card", order: 0 },
        { id: "demo-card-2", columnId: "demo-col-todo", title: "Write README screenshots", order: 1 },
      ],
    },
    {
      id: "demo-col-doing",
      boardId,
      name: "Doing",
      order: 1,
      cards: [{ id: "demo-card-3", columnId: "demo-col-doing", title: "Wire Socket.io presence", order: 0 }],
    },
    {
      id: "demo-col-done",
      boardId,
      name: "Done",
      order: 2,
      cards: [{ id: "demo-card-4", columnId: "demo-col-done", title: "OAuth login locally", order: 0 }],
    },
  ];
  return { boards: [{ id: boardId, name: "Demo board — Portfolio showcase", columns: cols }] };
}

function load(): { boards: DemoBoard[] } {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to seed
  }
  const s = seed();
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // private mode — keep in memory only
  }
  return s;
}

function save(s: { boards: DemoBoard[] }) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

function findBoard(id: string) {
  return load().boards.find((b) => b.id === id);
}

export const demoApi = {
  me: async () => ({ user: { id: "demo-user", name: "Demo Visitor" } }),
  boards: async () => {
    const s = load();
    return { boards: s.boards.map(({ columns, ...b }) => b) };
  },
  createBoard: async (name: string) => {
    const s = load();
    const boardId = uid("demo-board");
    const board: DemoBoard = {
      id: boardId,
      name,
      columns: ["To do", "Doing", "Done"].map((n, i) => ({
        id: uid("demo-col"),
        boardId,
        name: n,
        order: i,
        cards: [],
      })),
    };
    s.boards.unshift(board);
    save(s);
    const { columns, ...rest } = board;
    void columns;
    return { board: rest };
  },
  board: async (id: string) => {
    const b = findBoard(id) ?? load().boards[0];
    if (!b) throw new Error("Board not found");
    return { board: { ...b, members: [] } };
  },
  createColumn: async (boardId: string, name: string) => {
    const s = load();
    const b = s.boards.find((x) => x.id === boardId) ?? s.boards[0];
    const col: DemoColumn = {
      id: uid("demo-col"),
      boardId: b.id,
      name,
      order: b.columns.length,
      cards: [],
    };
    b.columns.push(col);
    save(s);
    return { column: col };
  },
  createCard: async (columnId: string, title: string, description?: string) => {
    const s = load();
    for (const b of s.boards) {
      const col = b.columns.find((c) => c.id === columnId);
      if (col) {
        const card: DemoCard = {
          id: uid("demo-card"),
          columnId,
          title,
          description,
          order: col.cards.length,
        };
        col.cards.push(card);
        save(s);
        return { card };
      }
    }
    throw new Error("Column not found");
  },
  moveCard: async (cardId: string, toColumnId: string, toOrder: number) => {
    const s = load();
    let moving: DemoCard | undefined;
    for (const b of s.boards)
      for (const c of b.columns) {
        const i = c.cards.findIndex((x) => x.id === cardId);
        if (i >= 0) moving = c.cards.splice(i, 1)[0];
      }
    if (!moving) throw new Error("Card not found");
    for (const b of s.boards) {
      const dest = b.columns.find((c) => c.id === toColumnId);
      if (dest) {
        moving.columnId = toColumnId;
        moving.order = toOrder;
        dest.cards.splice(Math.min(toOrder, dest.cards.length), 0, moving);
        dest.cards.forEach((c, i) => (c.order = i));
        save(s);
        return { card: moving };
      }
    }
    throw new Error("Destination column not found");
  },
  invite: async (_boardId: string, email: string) => {
    // Simulated in demo — no real BoardMember row.
    return { member: { id: uid("demo-member"), email, role: "editor" } };
  },
  reset: async () => {
    const s = seed();
    save(s);
    return s;
  },
};

// Minimal socket.io-client-compatible fake: only on/off/emit are used by Board.tsx.
type Handler = (payload: any) => void;

class FakeSocket {
  private listeners = new Map<string, Set<Handler>>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private boardId: string | null = null;

  on(event: string, fn: Handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(fn);
    return this;
  }
  off(event: string, fn?: Handler) {
    if (!fn) this.listeners.delete(event);
    else this.listeners.get(event)?.delete(fn);
    return this;
  }
  private fire(event: string, payload: any) {
    this.listeners.get(event)?.forEach((fn) => {
      try {
        fn(payload);
      } catch {
        // ignore listener errors in demo
      }
    });
  }
  emit(event: string, ...args: any[]) {
    if (event === "board:join") {
      this.boardId = String(args[0] ?? "demo-board-1");
      // Simulated presence: you + two collaborators.
      setTimeout(
        () =>
          this.fire("presence:update", [
            { id: "demo-user", name: "You (demo)" },
            { id: "demo-alex", name: "Alex" },
            { id: "demo-sam", name: "Sam" },
          ]),
        300
      );
      this.startBot();
    }
    if (event === "board:leave") this.stopBot();
    return this;
  }
  private startBot() {
    this.stopBot();
    const lines = [
      "moved a card to Done",
      "is reviewing the board",
      "added a comment",
      "reordered a column",
    ];
    let n = 0;
    this.timer = setInterval(() => {
      n += 1;
      const s = load();
      const b = s.boards.find((x) => x.id === this.boardId) ?? s.boards[0];
      if (!b || b.columns.length < 2) return;
      // Every 3rd tick: simulate a collaborator card creation; else a move.
      if (n % 3 === 0) {
        const col = b.columns[0];
        const card: DemoCard = {
          id: uid("demo-card"),
          columnId: col.id,
          title: `Collaborator idea ${n}`,
          order: col.cards.length,
        };
        col.cards.push(card);
        save(s);
        this.fire("card:created", { card, actor: { name: "Alex" } });
      } else {
        const from = b.columns[0];
        const to = b.columns[b.columns.length - 1];
        const card = from.cards[0];
        if (!card) return;
        from.cards.shift();
        card.columnId = to.id;
        card.order = to.cards.length;
        to.cards.push(card);
        save(s);
        this.fire("card:moved", { card, actor: { name: "Alex" } });
        this.fire("presence:update", [
          { id: "demo-user", name: "You (demo)" },
          { id: "demo-alex", name: `Alex — ${lines[n % lines.length]}` },
          { id: "demo-sam", name: "Sam" },
        ]);
      }
    }, 14000);
  }
  private stopBot() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

let demoSocket: FakeSocket | null = null;
export function getDemoSocket(): unknown {
  if (!demoSocket) demoSocket = new FakeSocket();
  return demoSocket;
}
