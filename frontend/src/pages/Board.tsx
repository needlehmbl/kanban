import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { DndContext, DragOverlay, closestCorners } from "@dnd-kit/core";
import Column from "../components/Column";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";

export default function Board() {
  const { boardId } = useParams();
  const [board, setBoard] = useState<any>(null);
  const [presence, setPresence] = useState<any[]>([]);
  const [toasts, setToasts] = useState<string[]>([]);
  const [activeCard, setActiveCard] = useState<any>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [colName, setColName] = useState("");

  function pushToast(msg: string) {
    setToasts((t) => [...t.slice(-4), msg]);
    setTimeout(() => setToasts((t) => t.slice(1)), 4000);
  }

  useEffect(() => {
    if (!boardId) return;
    api.board(boardId).then((d) => setBoard(d.board)).catch(() => {});

    const socket = getSocket();
    socket.emit("board:join", boardId);

    const onCreated = (p: any) => {
      setBoard((b: any) => {
        if (!b) return b;
        return {
          ...b,
          columns: b.columns.map((c: any) =>
            c.id === p.card.columnId
              ? { ...c, cards: [...c.cards, p.card] }
              : c
          ),
        };
      });
      pushToast(`${p.actor?.name ?? "Someone"} created '${p.card.title}'`);
    };
    const onMoved = (p: any) => {
      setBoard((b: any) => {
        if (!b) return b;
        // remove from all columns, insert into dest at order
        const cols = b.columns.map((c: any) => ({
          ...c,
          cards: c.cards.filter((x: any) => x.id !== p.card.id),
        }));
        return {
          ...b,
          columns: cols.map((c: any) =>
            c.id === p.card.columnId
              ? {
                  ...c,
                  cards: [...c.cards, p.card].sort(
                    (a: any, b2: any) => a.order - b2.order
                  ),
                }
              : c
          ),
        };
      });
      pushToast(
        `${p.actor?.name ?? "Someone"} moved '${p.card.title}'`
      );
    };
    const onCol = (p: any) => {
      setBoard((b: any) =>
        b ? { ...b, columns: [...b.columns, { ...p.column, cards: [] }] } : b
      );
      pushToast(`${p.actor?.name ?? "Someone"} added column '${p.column.name}'`);
    };
    const onPresence = (list: any[]) => setPresence(list);

    socket.on("card:created", onCreated);
    socket.on("card:moved", onMoved);
    socket.on("column:created", onCol);
    socket.on("presence:update", onPresence);
    return () => {
      socket.emit("board:leave", boardId);
      socket.off("card:created", onCreated);
      socket.off("card:moved", onMoved);
      socket.off("column:created", onCol);
      socket.off("presence:update", onPresence);
    };
  }, [boardId]);

  const columns = useMemo(() => board?.columns ?? [], [board]);

  async function addColumn(e: React.FormEvent) {
    e.preventDefault();
    if (!boardId || !colName.trim()) return;
    const d = await api.createColumn(boardId, colName.trim());
    setBoard((b: any) => ({
      ...b,
      columns: [...b.columns, { ...d.column, cards: [] }],
    }));
    setColName("");
  }

  async function addCard(columnId: string, title: string) {
    const d = await api.createCard(columnId, title);
    setBoard((b: any) => ({
      ...b,
      columns: b.columns.map((c: any) =>
        c.id === columnId ? { ...c, cards: [...c.cards, d.card] } : c
      ),
    }));
  }

  async function moveCard(cardId: string, toColumnId: string, toOrder?: number) {
    const dest = columns.find((c: any) => c.id === toColumnId);
    const order = toOrder ?? dest?.cards?.length ?? 0;
    const d = await api.moveCard(cardId, toColumnId, order);
    // optimistic local apply (socket echo will also arrive; dedupe by id)
    setBoard((b: any) => ({
      ...b,
      columns: b.columns.map((c: any) => ({
        ...c,
        cards: c.cards.filter((x: any) => x.id !== cardId),
      })).map((c: any) =>
        c.id === d.card.columnId
          ? { ...c, cards: [...c.cards, d.card] }
          : c
      ),
    }));
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!boardId || !inviteEmail.trim()) return;
    try {
      await api.invite(boardId, inviteEmail.trim());
      pushToast(`Invited ${inviteEmail.trim()}`);
      setInviteEmail("");
    } catch (err: any) {
      pushToast(err.message);
    }
  }

  if (!board) return <div>Loading…</div>;

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-2xl font-bold">{board.name}</h1>
        <div className="flex -space-x-2">
          {presence.map((u: any, i: number) => (
            <div
              key={i}
              title={u.name}
              className="w-8 h-8 rounded-full bg-slate-700 text-white text-xs flex items-center justify-center border-2 border-white overflow-hidden"
            >
              {u.avatarUrl ? (
                <img src={u.avatarUrl} alt={u.name} />
              ) : (
                (u.name ?? "?").slice(0, 1)
              )}
            </div>
          ))}
        </div>
        <form onSubmit={invite} className="flex gap-2 ml-auto">
          <input
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="invite by email"
            className="border rounded px-2 py-1 text-sm"
          />
          <button className="text-sm bg-slate-900 text-white rounded px-3">
            Invite
          </button>
        </form>
      </div>

      <form onSubmit={addColumn} className="flex gap-2 mb-4 max-w-sm">
        <input
          value={colName}
          onChange={(e) => setColName(e.target.value)}
          placeholder="New column"
          className="flex-1 border rounded px-3 py-1 text-sm"
        />
        <button className="text-sm bg-white border rounded px-3">
          Add column
        </button>
      </form>

      <DndContext
        collisionDetection={closestCorners}
        onDragStart={(e) =>
          setActiveCard((e.active.data.current as any)?.card ?? null)
        }
        onDragEnd={(e) => {
          setActiveCard(null);
          const card = (e.active.data.current as any)?.card;
          const overId = String(e.over?.id ?? "");
          if (!card || !overId) return;
          // over may be a card id or a column id
          let destCol = columns.find((c: any) => c.id === overId);
          let destIndex: number | undefined;
          if (!destCol) {
            for (const c of columns) {
              const idx = c.cards.findIndex((x: any) => x.id === overId);
              if (idx >= 0) {
                destCol = c;
                destIndex = idx;
                break;
              }
            }
          }
          if (destCol && card) moveCard(card.id, destCol.id, destIndex).catch(() => {});
        }}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((col: any) => (
            <Column
              key={col.id}
              column={col}
              columns={columns}
              onAddCard={addCard}
              onMoveCard={(cardId, toCol) => moveCard(cardId, toCol)}
            />
          ))}
        </div>
        <DragOverlay>
          {activeCard ? (
            <div className="bg-white rounded shadow border px-3 py-2 text-sm">
              {activeCard.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <div className="fixed bottom-4 right-4 space-y-2">
        {toasts.map((t, i) => (
          <div
            key={i}
            className="bg-slate-900 text-white text-sm rounded px-3 py-2 shadow"
          >
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}
