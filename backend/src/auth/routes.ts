import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import passport from "./passport.js";
import { requireAuth } from "./middleware.js";

const prisma = new PrismaClient();
export const authRouter = Router();

authRouter.get(
  "/github",
  passport.authenticate("github", { scope: ["user:email"] })
);

authRouter.get(
  "/github/callback",
  passport.authenticate("github", {
    failureRedirect: process.env.FRONTEND_URL
      ? `${process.env.FRONTEND_URL}/login?error=oauth`
      : "http://localhost:5176/login?error=oauth",
  }),
  (_req, res) => {
    const frontend =
      process.env.FRONTEND_URL ?? "http://localhost:5176";
    res.redirect(`${frontend}/boards`);
  }
);

authRouter.post("/logout", (req, res) => {
  req.logout(() => {
    req.session?.destroy(() => {
      res.json({ ok: true });
    });
  });
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});
