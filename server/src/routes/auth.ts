import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { signToken, authMiddleware } from "../middleware/auth.js";
import { registerUserWithStarterPlaylist } from "../services/registration.js";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(1).max(80),
  artistIds: z.array(z.number().int().positive()).min(1).max(20),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Некорректные данные", details: parsed.error.flatten() });
    return;
  }
  try {
    const user = await registerUserWithStarterPlaylist(parsed.data);
    const token = signToken({ sub: user.id, email: user.email });
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, displayName: user.displayName },
    });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "EMAIL_TAKEN") {
      res.status(409).json({ error: "Этот email уже зарегистрирован" });
      return;
    }
    if (code === "NO_ARTISTS") {
      res.status(400).json({ error: "Выберите хотя бы одного артиста" });
      return;
    }
    if (code === "INVALID_ARTISTS") {
      res.status(400).json({ error: "Указаны несуществующие артисты" });
      return;
    }
    console.error(e);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Некорректные данные" });
    return;
  }
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    res.status(401).json({ error: "Неверный email или пароль" });
    return;
  }
  const token = signToken({ sub: user.id, email: user.email });
  res.json({
    token,
    user: { id: user.id, email: user.email, displayName: user.displayName },
  });
});

router.get("/me", authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    select: { id: true, email: true, displayName: true, createdAt: true },
  });
  if (!user) {
    res.status(404).json({ error: "Пользователь не найден" });
    return;
  }
  const favorites = await prisma.userFavoriteArtist.findMany({
    where: { userId: user.id },
    include: { artist: { select: { id: true, name: true } } },
  });
  res.json({
    ...user,
    favoriteArtists: favorites.map((f) => f.artist),
  });
});

export default router;
