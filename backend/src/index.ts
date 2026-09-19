import "dotenv/config";
import express from "express";
import session from "express-session";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import pgSession from "connect-pg-simple";
import pg from "pg";
import passport from "./auth/passport.js";
import { authRouter } from "./auth/routes.js";
import { boardsRouter } from "./routes/boards.js";
import { registerBoardSocket } from "./sockets/boardSocket.js";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5176";
const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://kanban:kanban@localhost:5432/kanban";

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());

const PgStore = pgSession(session);
const pgPool = new pg.Pool({ connectionString: DATABASE_URL });

app.use(
  session({
    store: new PgStore({ pool: pgPool, createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET ?? "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "kanban-api" });
});

app.use("/auth", authRouter);
app.use("/api/boards", boardsRouter);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: FRONTEND_URL, credentials: true },
});
registerBoardSocket(io);

httpServer.listen(PORT, () => {
  console.log(`kanban api listening on :${PORT}`);
});
