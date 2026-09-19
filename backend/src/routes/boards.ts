import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../auth/middleware.js";
import { emitToBoard } from "../sockets/boardSocket.js";

const prisma = new PrismaClient();
export const boardsRouter = Router();

boardsRouter.use(requireAuth);

function userId(req: any): string {
  return req.user.id as string;
}

async function assertMember(boardId: string, uid: string) {
  const member = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: uid } },
  });
  return member;
}

// List boards where current user is a member
boardsRouter.get("/", async (req, res) => {
  const uid = userId(req);
  const memberships = await prisma.boardMember.findMany({
    where: { userId: uid },
    include: { board: true },
    orderBy: { board: { createdAt: "desc" } },
  });
  res.json({ boards: memberships.map((m) => m.board) });
});

// Create board (creator becomes owner member)
boardsRouter.post("/", async (req, res) => {
  const uid = userId(req);
  const { name } = req.body ?? {};
  if (!name) return res.status(400).json({ error: "name required" });
  const board = await prisma.board.create({
    data: {
      name,
      ownerId: uid,
      members: { create: { userId: uid, role: "owner" } },
    },
  });
  res.status(201).json({ board });
});

// Full board detail with columns + cards
boardsRouter.get("/:boardId", async (req, res) => {
  const uid = userId(req);
  const { boardId } = req.params;
  const member = await assertMember(boardId, uid);
  if (!member) return res.status(403).json({ error: "Not a member" });
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      columns: {
        orderBy: { order: "asc" },
        include: { cards: { orderBy: { order: "asc" } } },
      },
      members: { include: { user: true } },
    },
  });
  if (!board) return res.status(404).json({ error: "Not found" });
  res.json({ board });
});

// Invite by email: invited user must already exist (logged in once via OAuth)
boardsRouter.post("/:boardId/invite", async (req, res) => {
  const uid = userId(req);
  const { boardId } = req.params;
  const { email } = req.body ?? {};
  if (!email) return res.status(400).json({ error: "email required" });
  const member = await assertMember(boardId, uid);
  if (!member) return res.status(403).json({ error: "Not a member" });
  const invited = await prisma.user.findUnique({ where: { email } });
  if (!invited)
    return res
      .status(404)
      .json({ error: "User not found — they must log in once via OAuth first" });
  const created = await prisma.boardMember.upsert({
    where: { boardId_userId: { boardId, userId: invited.id } },
    update: {},
    create: { boardId, userId: invited.id, role: "editor" },
  });
  emitToBoard(boardId, "member:added", { member: created });
  res.status(201).json({ member: created });
});

// Create column
boardsRouter.post("/:boardId/columns", async (req, res) => {
  const uid = userId(req);
  const { boardId } = req.params;
  const { name } = req.body ?? {};
  if (!name) return res.status(400).json({ error: "name required" });
  if (!(await assertMember(boardId, uid)))
    return res.status(403).json({ error: "Not a member" });
  const count = await prisma.column.count({ where: { boardId } });
  const column = await prisma.column.create({
    data: { boardId, name, order: count },
  });
  emitToBoard(boardId, "column:created", {
    column,
    actor: (req as any).user,
  });
  res.status(201).json({ column });
});

// Create card
boardsRouter.post("/columns/:columnId/cards", async (req, res) => {
  const uid = userId(req);
  const { columnId } = req.params;
  const { title, description } = req.body ?? {};
  if (!title) return res.status(400).json({ error: "title required" });
  const column = await prisma.column.findUnique({ where: { id: columnId } });
  if (!column) return res.status(404).json({ error: "Column not found" });
  if (!(await assertMember(column.boardId, uid)))
    return res.status(403).json({ error: "Not a member" });
  const count = await prisma.card.count({ where: { columnId } });
  const card = await prisma.card.create({
    data: { columnId, title, description, order: count },
  });
  emitToBoard(column.boardId, "card:created", {
    card,
    actor: (req as any).user,
  });
  res.status(201).json({ card });
});

// Move card (within/between columns) + reorder
boardsRouter.patch("/cards/:cardId/move", async (req, res) => {
  const uid = userId(req);
  const { cardId } = req.params;
  const { toColumnId, toOrder } = req.body ?? {};
  if (!toColumnId) return res.status(400).json({ error: "toColumnId required" });
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { column: true },
  });
  if (!card) return res.status(404).json({ error: "Card not found" });
  const boardId = card.column.boardId;
  if (!(await assertMember(boardId, uid)))
    return res.status(403).json({ error: "Not a member" });

  const destColumn = await prisma.column.findUnique({
    where: { id: toColumnId },
  });
  if (!destColumn || destColumn.boardId !== boardId)
    return res.status(400).json({ error: "Invalid destination column" });

  const newOrder = typeof toOrder === "number" ? toOrder : 0;

  // Shift orders in destination to make room, then move card.
  await prisma.$transaction(async (tx) => {
    await tx.card.updateMany({
      where: { columnId: toColumnId, order: { gte: newOrder } },
      data: { order: { increment: 1 } },
    });
    await tx.card.update({
      where: { id: cardId },
      data: { columnId: toColumnId, order: newOrder },
    });
    // Compact source column if it changed
    if (card.columnId !== toColumnId) {
      const remaining = await tx.card.findMany({
        where: { columnId: card.columnId },
        orderBy: { order: "asc" },
      });
      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].order !== i) {
          await tx.card.update({
            where: { id: remaining[i].id },
            data: { order: i },
          });
        }
      }
    }
  });

  const updated = await prisma.card.findUnique({ where: { id: cardId } });
  emitToBoard(boardId, "card:moved", {
    card: updated,
    fromColumnId: card.columnId,
    actor: (req as any).user,
  });
  res.json({ card: updated });
});

// Edit card
boardsRouter.patch("/cards/:cardId", async (req, res) => {
  const uid = userId(req);
  const { cardId } = req.params;
  const { title, description } = req.body ?? {};
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { column: true },
  });
  if (!card) return res.status(404).json({ error: "Card not found" });
  if (!(await assertMember(card.column.boardId, uid)))
    return res.status(403).json({ error: "Not a member" });
  const updated = await prisma.card.update({
    where: { id: cardId },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
    },
  });
  emitToBoard(card.column.boardId, "card:updated", {
    card: updated,
    actor: (req as any).user,
  });
  res.json({ card: updated });
});
